import React, { useMemo, useState } from "react";
import { matrixSales } from "@/api/matrixSalesClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Package2, 
    TrendingDown, 
    ShoppingCart,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Shield
} from "lucide-react";
import StatCard from "@/components/erp/StatCard";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePermissions } from "@/components/utils/usePermissions";
import { useLanguage } from "@/components/utils/languageContext";
import AdminCenter from "./AdminCenter";
import AIAssistant from "./AIAssistant";
import Analytics from "./Analytics";
import ApprovalWorkflows from "./ApprovalWorkflows";
import Approvals from "./Approvals";
import AssetLifecycle from "./AssetLifecycle";
import AssetScanner from "./AssetScanner";
import AssetVerification from "./AssetVerification";
import BudgetManagement from "./BudgetManagement";
import CoilManagement from "./CoilManagement";
import ComplianceReports from "./ComplianceReports";
import Costing from "./Costing";
import DemandPlanning from "./DemandPlanning";
import DepreciationReports from "./DepreciationReports";
import Finance from "./Finance";
import FinancialReports from "./FinancialReports";
import FixedAssets from "./FixedAssets";
import HR from "./HR";
import HRReports from "./HRReports";
import ITSecurityReports from "./ITSecurityReports";
import Integrations from "./Integrations";
import Inventory from "./Inventory";
import InventoryReports from "./InventoryReports";
import KPIDashboard from "./KPIDashboard";
import ManufacturingReports from "./ManufacturingReports";
import MasterDataManagement from "./MasterDataManagement";
import Notifications from "./Notifications";
import POS from "./POS";
import Production from "./Production";
import Projects from "./Projects";
import Purchasing from "./Purchasing";
import Quality from "./Quality";
import QualityMaintenanceReports from "./QualityMaintenanceReports";
import Reports from "./Reports";
import Sales from "./Sales";
import SalesReports from "./SalesReports";
import SupplyChain from "./SupplyChain";
import TreasuryManagement from "./TreasuryManagement";
import ZakatManagement from "./ZakatManagement";
import ZATCA from "./ZATCA";

const ModulePanel = ({ components }) => (
    <div className="space-y-6">
        {components.map(({ name, Component }) => (
            <section key={name}>
                <Component />
            </section>
        ))}
    </div>
);

function DashboardOverview() {
    const { isAdmin, hasPermission, getRoleNames } = usePermissions();
    const { t } = useLanguage();

    const { data: assets = [] } = useQuery({
        queryKey: ['assets'],
        queryFn: () => matrixSales.entities.FixedAsset.list(),
        initialData: []
    });

    const { data: salesOrders = [] } = useQuery({
        queryKey: ['salesOrders'],
        queryFn: () => matrixSales.entities.SalesOrder.list('-order_date', 10),
        initialData: []
    });

    const { data: maintenance = [] } = useQuery({
        queryKey: ['maintenance'],
        queryFn: () => matrixSales.entities.AssetMaintenance.list('-maintenance_date', 20),
        initialData: []
    });

    const { data: approvalRequests = [] } = useQuery({
        queryKey: ['approvalRequests'],
        queryFn: () => matrixSales.entities.ApprovalRequest.list('-created_date', 10),
        initialData: []
    });

    const { data: verificationTasks = [] } = useQuery({
        queryKey: ['verificationTasks'],
        queryFn: () => matrixSales.entities.AssetVerificationTask.list('-scheduled_date', 5),
        initialData: []
    });

    const assetList = Array.isArray(assets) ? assets : [];
    const salesOrderList = Array.isArray(salesOrders) ? salesOrders : [];
    const maintenanceList = Array.isArray(maintenance) ? maintenance : [];
    const approvalRequestList = Array.isArray(approvalRequests) ? approvalRequests : [];
    const verificationTaskList = Array.isArray(verificationTasks) ? verificationTasks : [];

    const activeAssets = assetList.filter(a => a.status === 'active').length;
    const totalAssetValue = assetList.reduce((sum, a) => sum + (a.acquisition_cost || 0), 0);
    const totalNBV = assetList.reduce((sum, a) => sum + (a.net_book_value || 0), 0);
    
    const pendingSalesOrders = salesOrderList.filter(o =>
        o.status === 'pending_approval' || o.status === 'draft'
    ).length;

    const overdueMaintenance = maintenanceList.filter(m =>
        m.status === 'scheduled' && new Date(m.scheduled_date) < new Date()
    ).length;

    const pendingApprovals = approvalRequestList.filter(a => a.status === 'pending').length;

    const overdueVerifications = verificationTaskList.filter(t =>
        t.status === 'scheduled' && new Date(t.scheduled_date) < new Date()
    ).length;

    return (
        <div className="space-y-4 md:space-y-6">
            {!isAdmin && getRoleNames().length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {getRoleNames().map((roleName, idx) => (
                        <Badge key={idx} variant="outline">
                            {roleName}
                        </Badge>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {hasPermission('finance.fixed_asset', 'view') && (
                    <>
                        <StatCard
                            title={`${t('active')} Assets`}
                            value={activeAssets}
                            icon={Package2}
                            trend={`SAR ${(totalAssetValue / 1000000).toFixed(1)}M total value`}
                            color="emerald"
                        />
                        <StatCard
                            title={t('netBookValue')}
                            value={`SAR ${(totalNBV / 1000000).toFixed(1)}M`}
                            icon={TrendingDown}
                            trend="Current valuation"
                            color="blue"
                        />
                    </>
                )}
                
                {hasPermission('sales.sales_order', 'view') && (
                    <StatCard
                        title={`${t('pending')} Sales Orders`}
                        value={pendingSalesOrders}
                        icon={ShoppingCart}
                        trend="Awaiting processing"
                        color="indigo"
                    />
                )}
                
                {(hasPermission('maintenance.work_order', 'view') || hasPermission('finance.fixed_asset', 'view')) && (
                    <StatCard
                        title={`${t('overdue')} ${t('maintenance')}`}
                        value={overdueMaintenance}
                        icon={AlertTriangle}
                        trend="Requires attention"
                        color="red"
                    />
                )}
            </div>

            <div className="space-y-3">
                {pendingApprovals > 0 && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-900">
                            <strong>{pendingApprovals} approval requests</strong> are waiting for your review
                            <Link to={createPageUrl('Approvals')} className="ml-2 underline font-semibold">
                                View {t('approvals')} →
                            </Link>
                        </AlertDescription>
                    </Alert>
                )}

                {overdueMaintenance > 0 && hasPermission('maintenance.work_order', 'view') && (
                    <Alert className="bg-red-50 border-red-200">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-900">
                            <strong>{overdueMaintenance} {t('maintenance')} tasks</strong> are {t('overdue')}
                            <Link to={createPageUrl('FixedAssets')} className="ml-2 underline font-semibold">
                                View {t('maintenance')} →
                            </Link>
                        </AlertDescription>
                    </Alert>
                )}

                {overdueVerifications > 0 && hasPermission('finance.fixed_asset', 'view') && (
                    <Alert className="bg-orange-50 border-orange-200">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-900">
                            <strong>{overdueVerifications} asset verification tasks</strong> are {t('overdue')}
                            <Link to={createPageUrl('AssetVerification')} className="ml-2 underline font-semibold">
                                View Verifications →
                            </Link>
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {hasPermission('finance.fixed_asset', 'view') && (
                    <Link to={createPageUrl('FixedAssets')}>
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-100 p-3 rounded-lg">
                                        <Package2 className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{t('fixedAssets')}</p>
                                        <p className="text-sm text-gray-600">{activeAssets} {t('active')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                )}

                {hasPermission('sales.sales_order', 'view') && (
                    <Link to={createPageUrl('Sales')}>
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-100 p-3 rounded-lg">
                                        <ShoppingCart className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Sales Orders</p>
                                        <p className="text-sm text-gray-600">{pendingSalesOrders} {t('pending')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                )}

                {hasPermission('maintenance.work_order', 'view') && (
                    <Link to={createPageUrl('FixedAssets')}>
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-yellow-100 p-3 rounded-lg">
                                        <AlertTriangle className="w-6 h-6 text-yellow-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{t('maintenance')}</p>
                                        <p className="text-sm text-gray-600">{overdueMaintenance} {t('overdue')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                )}

                <Link to={createPageUrl('Approvals')}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-purple-100 p-3 rounded-lg">
                                    <Clock className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="font-semibold">{t('approvals')}</p>
                                    <p className="text-sm text-gray-600">{pendingApprovals} {t('pending')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {hasPermission('finance.fixed_asset', 'view') && (
                    <Link to={createPageUrl('AssetVerification')}>
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-indigo-100 p-3 rounded-lg">
                                        <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{t('assetVerification')}</p>
                                        <p className="text-sm text-gray-600">{overdueVerifications} tasks</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                )}

                {isAdmin && (
                    <Link to={createPageUrl('AdminCenter')}>
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-emerald-200">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-100 p-3 rounded-lg">
                                        <Shield className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{t('adminCenter')}</p>
                                        <p className="text-sm text-gray-600">System config</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                )}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState("overview");
    const dashboardTabs = useMemo(() => ([
        { value: "overview", label: "Overview", components: [
            { name: "Dashboard Overview", Component: DashboardOverview },
            { name: "Analytics", Component: Analytics },
            { name: "AI Assistant", Component: AIAssistant },
            { name: "KPI Dashboard", Component: KPIDashboard }
        ] },
        { value: "sales", label: "Sales", components: [
            { name: "Sales", Component: Sales },
            { name: "Point of Sale", Component: POS },
            { name: "Sales Reports", Component: SalesReports }
        ] },
        { value: "inventory", label: "Inventory & Quality", components: [
            { name: "Inventory", Component: Inventory },
            { name: "Coil Management", Component: CoilManagement },
            { name: "Quality", Component: Quality },
            { name: "Inventory Reports", Component: InventoryReports },
            { name: "Quality Maintenance Reports", Component: QualityMaintenanceReports }
        ] },
        { value: "operations", label: "Operations", components: [
            { name: "Production", Component: Production },
            { name: "Manufacturing Reports", Component: ManufacturingReports },
            { name: "Asset Scanner", Component: AssetScanner },
            { name: "Asset Verification", Component: AssetVerification }
        ] },
        { value: "supply-chain", label: "Supply Chain", components: [
            { name: "Purchasing", Component: Purchasing },
            { name: "Supply Chain", Component: SupplyChain },
            { name: "Demand Planning", Component: DemandPlanning }
        ] },
        { value: "finance", label: "Finance", components: [
            { name: "Finance", Component: Finance },
            { name: "Costing", Component: Costing },
            { name: "Treasury Management", Component: TreasuryManagement },
            { name: "Budget Management", Component: BudgetManagement },
            { name: "Fixed Assets", Component: FixedAssets },
            { name: "Asset Lifecycle", Component: AssetLifecycle },
            { name: "Depreciation Reports", Component: DepreciationReports },
            { name: "Financial Reports", Component: FinancialReports },
            { name: "Zakat Management", Component: ZakatManagement }
        ] },
        { value: "projects", label: "Projects", components: [{ name: "Projects", Component: Projects }] },
        { value: "hr", label: "HR", components: [
            { name: "HR", Component: HR },
            { name: "HR Reports", Component: HRReports }
        ] },
        { value: "compliance", label: "Compliance", components: [
            { name: "ZATCA", Component: ZATCA },
            { name: "Compliance Reports", Component: ComplianceReports },
            { name: "IT Security Reports", Component: ITSecurityReports }
        ] },
        { value: "reports", label: "Reports", components: [
            { name: "Reports", Component: Reports },
            { name: "Sales Reports", Component: SalesReports },
            { name: "Financial Reports", Component: FinancialReports },
            { name: "Inventory Reports", Component: InventoryReports },
            { name: "Manufacturing Reports", Component: ManufacturingReports },
            { name: "HR Reports", Component: HRReports },
            { name: "Compliance Reports", Component: ComplianceReports },
            { name: "Quality Maintenance Reports", Component: QualityMaintenanceReports },
            { name: "Depreciation Reports", Component: DepreciationReports }
        ] },
        { value: "workflow", label: "Workflow", components: [
            { name: "Approvals", Component: Approvals },
            { name: "Approval Workflows", Component: ApprovalWorkflows }
        ] },
        { value: "administration", label: "Administration", components: [
            { name: "Master Data Management", Component: MasterDataManagement },
            { name: "Admin Center", Component: AdminCenter },
            { name: "Integrations", Component: Integrations },
            { name: "Notifications", Component: Notifications }
        ] }
    ]), []);

    const activeModule = dashboardTabs.find(tab => tab.value === activeTab) || dashboardTabs[0];

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('dashboard')}</h1>
                <p className="text-sm md:text-base text-gray-600 mt-1">
                    Central access to every HORIZON module, dashboard card, chart, and report.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                    <TabsList className="h-auto min-w-max justify-start bg-transparent p-0">
                        {dashboardTabs.map(tab => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="px-3 py-2 data-[state=active]:bg-[#24466f] data-[state=active]:text-white"
                            >
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value={activeModule.value} className="mt-0">
                    <ModulePanel components={activeModule.components} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
