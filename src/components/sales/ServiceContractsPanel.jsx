import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/erp/DataTable";
import ServiceContractForm from "@/components/sales/ServiceContractForm";
import { matrixSales } from "@/api/matrixSalesClient";
import { useToast } from "@/components/ui/use-toast";
import { calculateServiceBusinessKpis, generateRecurringInvoices, isMissingRecurringBillingRunTableError } from "@/lib/serviceBilling";
import { createNotification } from "@/components/utils/notificationService";
import { CalendarClock, FilePlus2, Plus, RefreshCw } from "lucide-react";

export default function ServiceContractsPanel({ invoices = [] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState(null);

  const { data: contracts = [] } = useQuery({
    queryKey: ["serviceContracts"],
    queryFn: () => matrixSales.entities.ServiceContract.list("-next_billing_date"),
    initialData: []
  });

  const kpis = calculateServiceBusinessKpis(contracts, invoices);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const generated = await generateRecurringInvoices({
        contracts,
        existingInvoices: invoices,
        createInvoice: (invoice) => matrixSales.entities.Invoice.create(invoice),
        updateContract: (contract, payload) => matrixSales.entities.ServiceContract.update(contract.id, payload),
        createNotification
      });

      try {
        await matrixSales.entities.RecurringBillingRun.create({
          run_date: new Date().toISOString(),
          generated_count: generated.length,
          status: "completed",
          notes: `Generated ${generated.length} recurring invoice(s)`
        });
      } catch (error) {
        if (!isMissingRecurringBillingRunTableError(error)) throw error;
        console.warn("Recurring billing run log skipped because the database migration is not applied yet.", error);
      }

      return generated;
    },
    onSuccess: (generated) => {
      queryClient.invalidateQueries({ queryKey: ["serviceContracts"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Recurring billing complete",
        description: `${generated.length} service invoice(s) generated.`
      });
    },
    onError: (error) => {
      toast({ title: "Recurring billing failed", description: error.message || "Please try again.", variant: "destructive" });
    }
  });

  const columns = [
    { header: "Contract #", key: "contract_number" },
    { header: "Customer", key: "customer_name" },
    { header: "Service Type", key: "service_type", isBadge: true },
    { header: "Cycle", key: "billing_cycle" },
    { header: "Amount", key: "monthly_amount", render: (value) => `SAR ${Number(value || 0).toLocaleString()}` },
    { header: "Next Billing", key: "next_billing_date" },
    { header: "End Date", key: "end_date" },
    { header: "Status", key: "status", isBadge: true }
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">MRR</p><p className="text-xl font-bold">SAR {kpis.monthlyRecurringRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">ARR</p><p className="text-xl font-bold">SAR {kpis.annualRecurringRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Active Contracts</p><p className="text-xl font-bold">{kpis.activeContracts}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Renewals 30d</p><p className="text-xl font-bold">{kpis.upcomingRenewals}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Overdue Invoices</p><p className="text-xl font-bold">{kpis.overdueInvoices}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Service Contracts & Recurring Billing</h3>
          <p className="text-sm text-slate-500">Managed services, cloud subscriptions, AMC/SLA, consulting, and support retainers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
            Generate Due Invoices
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setEditingContract(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New Contract
          </Button>
        </div>
      </div>

      <DataTable
        data={contracts}
        columns={columns}
        searchFields={["contract_number", "customer_name", "service_type"]}
        onEdit={(contract) => { setEditingContract(contract); setShowForm(true); }}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-slate-50 p-4">
          <FilePlus2 className="mb-2 h-5 w-5 text-[#24466f]" />
          <p className="font-semibold">Service-only invoices</p>
          <p className="text-sm text-slate-600">No item stock, warehouse, delivery, or PGI validation is required.</p>
        </div>
        <div className="rounded-lg border bg-slate-50 p-4">
          <CalendarClock className="mb-2 h-5 w-5 text-[#24466f]" />
          <p className="font-semibold">Recurring schedules</p>
          <p className="text-sm text-slate-600">Monthly, quarterly, annual, and custom billing cycles are supported.</p>
        </div>
        <div className="rounded-lg border bg-slate-50 p-4">
          <FilePlus2 className="mb-2 h-5 w-5 text-[#24466f]" />
          <p className="font-semibold">ZATCA ready</p>
          <p className="text-sm text-slate-600">Generated invoices use standard tax invoice defaults and existing QR/PDF templates.</p>
        </div>
      </div>

      {showForm && (
        <ServiceContractForm
          item={editingContract}
          onClose={() => {
            setShowForm(false);
            setEditingContract(null);
          }}
        />
      )}
    </div>
  );
}
