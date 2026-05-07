import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Code2, FileCheck, QrCode, Send, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { matrixSales } from "@/api/matrixSalesClient";
import {
    buildZatcaInvoiceXml,
    generateInvoiceHash,
    generateZatcaQrPayload,
    getZatcaSubmissionMethod,
    validateZatcaInvoice
} from "@/components/utils/zatcaCompliance";

const toList = (value) => Array.isArray(value) ? value : [];

const phase1Checks = [
    "Generate and store tax invoices electronically",
    "VAT calculation and invoice totals",
    "QR payload for simplified invoices",
    "Credit/debit note references",
    "Invoice archive fields"
];

const phase2Checks = [
    "UBL XML invoice payload",
    "Invoice hash and previous invoice hash fields",
    "Clearance flow for standard tax invoices",
    "Reporting flow for simplified tax invoices",
    "Submission log and retry tracking"
];

const getStatusClass = (status) => {
    const classes = {
        pass: "bg-green-100 text-green-800",
        pass_with_warning: "bg-amber-100 text-amber-800",
        fail: "bg-red-100 text-red-800"
    };
    return classes[status] || "bg-slate-100 text-slate-800";
};

export default function ZATCAPhaseReadiness({ invoices = [], activeConfig }) {
    const invoiceList = toList(invoices);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState(invoiceList[0]?.id || "");
    const [preview, setPreview] = useState({ qr: "", xml: "", hash: "", validation: null });
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const selectedInvoice = useMemo(
        () => invoiceList.find((invoice) => invoice.id === selectedInvoiceId) || invoiceList[0],
        [invoiceList, selectedInvoiceId]
    );

    const validations = useMemo(() => invoiceList.map((invoice) => ({
        invoice,
        validation: validateZatcaInvoice(invoice, activeConfig)
    })), [invoiceList, activeConfig]);

    const passCount = validations.filter((item) => item.validation.status === "pass").length;
    const warningCount = validations.filter((item) => item.validation.status === "pass_with_warning").length;
    const failCount = validations.filter((item) => item.validation.status === "fail").length;
    const readinessRate = invoiceList.length > 0 ? Math.round(((passCount + warningCount) / invoiceList.length) * 100) : 0;

    const generatePreview = async (invoice = selectedInvoice) => {
        if (!invoice) return;
        const validation = validateZatcaInvoice(invoice, activeConfig);
        const qr = generateZatcaQrPayload(invoice, activeConfig);
        const hash = await generateInvoiceHash({
            invoice_number: invoice.invoice_number,
            invoice_date: invoice.invoice_date,
            total_amount: invoice.total_amount,
            vat_amount: invoice.vat_amount ?? invoice.tax_amount,
            qr
        });
        const xml = buildZatcaInvoiceXml({ invoice, config: activeConfig, qrPayload: qr, invoiceHash: hash });
        setPreview({ qr, xml, hash, validation });
    };

    const submitMutation = useMutation({
        mutationFn: async (invoice) => {
            const validation = validateZatcaInvoice(invoice, activeConfig);
            const qr = generateZatcaQrPayload(invoice, activeConfig);
            const hash = await generateInvoiceHash({
                invoice_number: invoice.invoice_number,
                invoice_date: invoice.invoice_date,
                total_amount: invoice.total_amount,
                vat_amount: invoice.vat_amount ?? invoice.tax_amount,
                qr
            });
            const xml = buildZatcaInvoiceXml({ invoice, config: activeConfig, qrPayload: qr, invoiceHash: hash });
            const method = getZatcaSubmissionMethod(invoice);
            const success = validation.valid;
            const uuid = invoice.zatca_uuid || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ZATCA-${Date.now()}`);
            const now = new Date().toISOString();

            await matrixSales.entities.ZATCASubmissionLog.create({
                log_id: `ZLOG-${Date.now()}`,
                invoice_id: invoice.id,
                invoice_number: invoice.invoice_number,
                invoice_type: invoice.invoice_type || "standard",
                submission_method: method,
                submission_date: now,
                validation_status: validation.status,
                response_status_code: success ? 200 : 400,
                retry_attempt: invoice.zatca_retry_count || 0,
                processing_time_ms: 0,
                success,
                errors: validation.errors,
                warnings: validation.warnings,
                xml_payload_preview: xml.slice(0, 3000),
                qr_payload: qr,
                invoice_hash: hash
            });

            await matrixSales.entities.Invoice.update(invoice.id, {
                ...invoice,
                zatca_uuid: uuid,
                zatca_icv: invoice.zatca_icv || Date.now(),
                zatca_qr_code: qr,
                zatca_invoice_hash: hash,
                zatca_xml: xml,
                zatca_submission_method: method,
                zatca_submitted: success,
                zatca_status: success ? (method === "clearance" ? "cleared" : "reported") : "rejected",
                zatca_last_submission_at: now,
                zatca_errors: validation.errors,
                zatca_warnings: validation.warnings,
                zatca_retry_count: success ? (invoice.zatca_retry_count || 0) : (invoice.zatca_retry_count || 0) + 1
            });

            return { success, validation };
        },
        onSuccess: ({ success, validation }) => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["submissionLogs"] });
            toast({
                title: success ? "ZATCA submission recorded" : "ZATCA validation failed",
                description: success ? "Invoice status and submission log were updated." : validation.errors.join(" "),
                variant: success ? "default" : "destructive"
            });
        }
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-slate-500">Readiness</p>
                        <p className="mt-1 text-2xl font-bold">{readinessRate}%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-slate-500">Pass</p>
                        <p className="mt-1 text-2xl font-bold text-green-600">{passCount}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-slate-500">Warnings</p>
                        <p className="mt-1 text-2xl font-bold text-amber-600">{warningCount}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-slate-500">Failed</p>
                        <p className="mt-1 text-2xl font-bold text-red-600">{failCount}</p>
                    </CardContent>
                </Card>
            </div>

            {!activeConfig && (
                <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-900">
                        Active ZATCA configuration is required before Phase 1 or Phase 2 checks can pass.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            Phase 1 - Generation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {phase1Checks.map((check) => (
                            <div key={check} className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                {check}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5 text-blue-600" />
                            Phase 2 - Integration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {phase2Checks.map((check) => (
                            <div key={check} className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                {check}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Invoice Validation and Submission</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {validations.slice(0, 12).map(({ invoice, validation }) => (
                            <button
                                type="button"
                                key={invoice.id}
                                onClick={() => {
                                    setSelectedInvoiceId(invoice.id);
                                    generatePreview(invoice);
                                }}
                                className={`rounded-lg border p-3 text-left transition hover:bg-slate-50 ${selectedInvoice?.id === invoice.id ? "border-[#24466f] ring-1 ring-[#24466f]" : "border-slate-200"}`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold">{invoice.invoice_number || invoice.id}</p>
                                        <p className="truncate text-sm text-slate-500">{invoice.customer_name}</p>
                                    </div>
                                    <Badge className={getStatusClass(validation.status)}>{validation.status}</Badge>
                                </div>
                            </button>
                        ))}
                    </div>

                    {selectedInvoice && (
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => generatePreview(selectedInvoice)}>
                                <QrCode className="mr-2 h-4 w-4" />
                                Generate QR/XML Preview
                            </Button>
                            <Button
                                onClick={() => submitMutation.mutate(selectedInvoice)}
                                disabled={submitMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                <Send className="mr-2 h-4 w-4" />
                                {submitMutation.isPending ? "Processing..." : "Run Clearance/Reporting"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {(preview.qr || preview.xml) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Code2 className="h-5 w-5 text-slate-600" />
                            ZATCA Payload Preview
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="qr">
                            <TabsList>
                                <TabsTrigger value="qr">QR Payload</TabsTrigger>
                                <TabsTrigger value="xml">UBL XML</TabsTrigger>
                                <TabsTrigger value="validation">Validation</TabsTrigger>
                            </TabsList>
                            <TabsContent value="qr" className="space-y-2">
                                <Textarea readOnly value={preview.qr} className="min-h-24 font-mono text-xs" />
                                <p className="text-sm text-slate-500">Hash: {preview.hash}</p>
                            </TabsContent>
                            <TabsContent value="xml">
                                <Textarea readOnly value={preview.xml} className="min-h-96 font-mono text-xs" />
                            </TabsContent>
                            <TabsContent value="validation">
                                <div className="space-y-3">
                                    <Badge className={getStatusClass(preview.validation?.status)}>{preview.validation?.status}</Badge>
                                    {preview.validation?.errors?.map((error) => (
                                        <Alert key={error} className="border-red-200 bg-red-50">
                                            <AlertTriangle className="h-4 w-4 text-red-600" />
                                            <AlertDescription className="text-red-900">{error}</AlertDescription>
                                        </Alert>
                                    ))}
                                    {preview.validation?.warnings?.map((warning) => (
                                        <Alert key={warning} className="border-amber-200 bg-amber-50">
                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                            <AlertDescription className="text-amber-900">{warning}</AlertDescription>
                                        </Alert>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
