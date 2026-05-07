import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { matrixSales } from "@/api/matrixSalesClient";
import { CheckCircle2, FileText, GitBranch, Shield, Sparkles } from "lucide-react";

const baseActions = ["view", "create", "edit", "delete", "approve", "post", "reverse", "dispose", "perform", "process", "calculate", "close", "complete", "release", "analyze", "post_adjustment"];

const emptyPermissions = () => ({
    sales: {
        quotation: { view: false, create: false, edit: false, delete: false, approve: false },
        sales_order: { view: false, create: false, edit: false, delete: false, approve: false },
        delivery: { view: false, create: false, edit: false, delete: false },
        invoice: { view: false, create: false, edit: false, delete: false },
        sales_return: { view: false, create: false, edit: false, delete: false },
        price_list: { view: false, create: false, edit: false, delete: false }
    },
    purchasing: {
        purchase_requisition: { view: false, create: false, edit: false, delete: false, approve: false },
        rfq: { view: false, create: false, edit: false, delete: false },
        purchase_order: { view: false, create: false, edit: false, delete: false, approve: false },
        grn: { view: false, create: false, edit: false, delete: false },
        vendor_invoice: { view: false, create: false, edit: false, delete: false, approve: false }
    },
    inventory: {
        stock_movement: { view: false, create: false, edit: false, delete: false },
        stock_transfer: { view: false, create: false, edit: false, delete: false, approve: false },
        cycle_count: { view: false, create: false, edit: false, delete: false, post_adjustment: false },
        stock_level: { view: false },
        batch: { view: false, create: false, edit: false }
    },
    production: {
        production_order: { view: false, create: false, edit: false, delete: false, release: false },
        bom: { view: false, create: false, edit: false, delete: false },
        routing: { view: false, create: false, edit: false, delete: false },
        work_center: { view: false, create: false, edit: false, delete: false },
        material_issue: { view: false, create: false },
        production_confirmation: { view: false, create: false }
    },
    quality: {
        qc_plan: { view: false, create: false, edit: false, delete: false },
        inspection_lot: { view: false, create: false, edit: false, complete: false },
        non_conformance: { view: false, create: false, edit: false, close: false },
        capa: { view: false, create: false, edit: false, approve: false },
        coa: { view: false, create: false, approve: false }
    },
    finance: {
        journal_entry: { view: false, create: false, edit: false, post: false, reverse: false },
        accounts_receivable: { view: false, create: false, edit: false },
        accounts_payable: { view: false, create: false, edit: false, approve: false },
        payment: { view: false, create: false, approve: false },
        fixed_asset: { view: false, create: false, edit: false, dispose: false },
        bank_reconciliation: { view: false, perform: false }
    },
    maintenance: {
        work_order: { view: false, create: false, edit: false, complete: false },
        pm_plan: { view: false, create: false, edit: false, delete: false },
        equipment: { view: false, create: false, edit: false, delete: false },
        spare_part: { view: false, create: false, edit: false }
    },
    hr: {
        employee: { view: false, create: false, edit: false, delete: false },
        leave_request: { view: false, create: false, approve: false },
        payroll: { view: false, process: false, approve: false },
        loan_advance: { view: false, create: false, approve: false },
        eos_settlement: { view: false, calculate: false, approve: false }
    },
    projects: {
        project: { view: false, create: false, edit: false, close: false },
        timesheet: { view: false, create: false, approve: false },
        expense: { view: false, create: false, approve: false },
        milestone: { view: false, create: false, complete: false }
    },
    costing: {
        product_cost: { view: false, create: false, edit: false, approve: false },
        cost_pool: { view: false, create: false, edit: false },
        cost_variance: { view: false, analyze: false }
    },
    master_data: {
        material: { view: false, create: false, edit: false, delete: false },
        customer: { view: false, create: false, edit: false, delete: false },
        vendor: { view: false, create: false, edit: false, delete: false },
        chart_of_accounts: { view: false, create: false, edit: false }
    },
    admin: {
        organization: { view: false, create: false, edit: false },
        user_management: { view: false, edit: false },
        role_management: { view: false, create: false, edit: false, delete: false },
        approval_matrix: { view: false, create: false, edit: false },
        document_series: { view: false, create: false, edit: false }
    },
    reports: {
        financial_reports: false,
        sales_reports: false,
        inventory_reports: false,
        manufacturing_reports: false,
        hr_reports: false,
        compliance_reports: false
    }
});

const enableModule = (permissions, moduleName) => {
    Object.values(permissions[moduleName] || {}).forEach((subModule) => {
        if (typeof subModule === "boolean") return;
        baseActions.forEach((action) => {
            if (Object.prototype.hasOwnProperty.call(subModule, action)) {
                subModule[action] = true;
            }
        });
    });
};

const roleTemplates = [
    { code: "SALES_MGR", name: "Sales Manager", modules: ["sales"], reports: ["sales_reports"] },
    { code: "PROC_MGR", name: "Procurement Manager", modules: ["purchasing"], reports: ["inventory_reports"] },
    { code: "FIN_MGR", name: "Finance Manager", modules: ["finance", "costing"], reports: ["financial_reports", "compliance_reports"] },
    { code: "INV_CTRL", name: "Inventory Controller", modules: ["inventory", "quality"], reports: ["inventory_reports"] },
    { code: "HR_MGR", name: "HR Manager", modules: ["hr"], reports: ["hr_reports"] },
    { code: "OPS_MGR", name: "Operations Manager", modules: ["production", "maintenance", "projects"], reports: ["manufacturing_reports"] },
    { code: "MASTER_DATA_ADMIN", name: "Master Data Admin", modules: ["master_data"], reports: [] }
];

const documentSeriesTemplates = [
    ["quotation", "QT"],
    ["sales_order", "SO"],
    ["delivery", "DN"],
    ["invoice", "INV"],
    ["purchase_requisition", "PR"],
    ["purchase_order", "PO"],
    ["grn", "GRN"],
    ["vendor_invoice", "VINV"],
    ["journal_entry", "JE"],
    ["payment", "PAY"],
    ["stock_movement", "SM"],
    ["stock_transfer", "STO"],
    ["cycle_count", "CC"],
    ["production_order", "PRD"],
    ["work_order", "WO"],
    ["project", "PRJ"],
    ["inspection_lot", "IL"],
    ["non_conformance", "NC"],
    ["capa", "CAPA"],
    ["coa", "COA"]
];

const approvalTemplates = [
    { document_type: "sales_order", threshold_min: 50000, required_role: "sales_manager", notes: "Sales manager approval for high value orders" },
    { document_type: "purchase_order", threshold_min: 25000, required_role: "procurement_manager", notes: "Procurement manager approval for purchase orders" },
    { document_type: "vendor_invoice", threshold_min: 10000, required_role: "controller", notes: "Finance approval before vendor invoice processing" },
    { document_type: "payment", threshold_min: 10000, required_role: "controller", notes: "Finance approval before payment release" },
    { document_type: "journal_entry", threshold_min: 0, required_role: "controller", notes: "Finance review for journal entries" },
    { document_type: "leave_request", threshold_min: 0, required_role: "hr_manager", notes: "HR approval for leave requests" },
    { document_type: "expense", threshold_min: 5000, required_role: "production_manager", notes: "Operations approval for project expenses" }
];

const upsertByField = async (entity, field, value, payload) => {
    const existing = await matrixSales.entities[entity].filter({ [field]: value });
    if (existing.length > 0) {
        return matrixSales.entities[entity].update(existing[0].id, { ...existing[0], ...payload });
    }
    return matrixSales.entities[entity].create(payload);
};

const buildRolePermissions = (template) => {
    const permissions = emptyPermissions();
    template.modules.forEach((moduleName) => enableModule(permissions, moduleName));
    template.reports.forEach((reportKey) => {
        permissions.reports[reportKey] = true;
    });
    return permissions;
};

export default function SystemSetupTemplates() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const seedMutation = useMutation({
        mutationFn: async () => {
            const currentYear = new Date().getFullYear().toString().slice(-2);

            await Promise.all(roleTemplates.map((template) => upsertByField("Role", "role_code", template.code, {
                role_code: template.code,
                role_name: template.name,
                description: `Default ${template.name} role template`,
                status: "active",
                is_system_role: true,
                permissions: buildRolePermissions(template)
            })));

            await Promise.all(documentSeriesTemplates.map(([documentType, prefix]) => upsertByField(
                "DocumentNumberSeries",
                "series_id",
                `${prefix}-ALL-${currentYear}`,
                {
                    series_id: `${prefix}-ALL-${currentYear}`,
                    document_type: documentType,
                    prefix,
                    branch_code: "ALL",
                    fiscal_year: currentYear,
                    current_number: 0,
                    starting_number: 1,
                    number_width: 6,
                    format_pattern: "{PREFIX}-{BR}-{FY}-{NNNNNN}",
                    status: "active",
                    auto_generate: true
                }
            )));

            await Promise.all(approvalTemplates.map((template) => upsertByField(
                "ApprovalMatrix",
                "matrix_id",
                `AM-${template.document_type}-${template.required_role}`,
                {
                    matrix_id: `AM-${template.document_type}-${template.required_role}`,
                    ...template,
                    threshold_max: null,
                    approval_level: 1,
                    is_mandatory: true,
                    can_skip_if_maker: false,
                    parallel_approval: false,
                    auto_approve_threshold: null,
                    notification_required: true,
                    escalation_hours: 24,
                    branch_code: null,
                    department: null,
                    status: "active",
                    effective_from: new Date().toISOString().split("T")[0],
                    effective_to: null
                }
            )));
        },
        onSuccess: () => {
            queryClient.invalidateQueries();
            toast({
                title: "Setup templates applied",
                description: "Default roles, document series, and approval rules are ready."
            });
        },
        onError: (error) => {
            toast({
                title: "Setup failed",
                description: error.message || "Unable to apply setup templates.",
                variant: "destructive"
            });
        }
    });

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-emerald-600" />
                        ERP Setup Templates
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Apply the baseline ERP setup for production readiness. This creates or updates default roles,
                        document numbering series, and approval matrix rules without changing database tables.
                    </p>
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-slate-200 p-4">
                            <Shield className="mb-2 h-5 w-5 text-blue-600" />
                            <p className="font-semibold">Default Roles</p>
                            <p className="text-sm text-slate-500">{roleTemplates.length} role templates</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-4">
                            <FileText className="mb-2 h-5 w-5 text-amber-600" />
                            <p className="font-semibold">Document Numbering</p>
                            <p className="text-sm text-slate-500">{documentSeriesTemplates.length} active series</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-4">
                            <GitBranch className="mb-2 h-5 w-5 text-purple-600" />
                            <p className="font-semibold">Approval Rules</p>
                            <p className="text-sm text-slate-500">{approvalTemplates.length} workflow rules</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => seedMutation.mutate()}
                        disabled={seedMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {seedMutation.isPending ? "Applying..." : "Apply Recommended Setup"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Included Approval Rules</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {approvalTemplates.map((template) => (
                            <Badge key={`${template.document_type}-${template.required_role}`} variant="outline">
                                {template.document_type} - {template.required_role}
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
