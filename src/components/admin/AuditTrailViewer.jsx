import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { matrixSales } from "@/api/matrixSalesClient";
import DataTable from "@/components/erp/DataTable";
import { Activity } from "lucide-react";

const getSeverityClass = (severity) => {
    const classes = {
        critical: "bg-red-100 text-red-800",
        warning: "bg-amber-100 text-amber-800",
        info: "bg-blue-100 text-blue-800"
    };
    return classes[severity] || "bg-slate-100 text-slate-800";
};

export default function AuditTrailViewer() {
    const { data: auditTrails = [], isLoading } = useQuery({
        queryKey: ["admin-audit-trails"],
        queryFn: () => matrixSales.entities.AuditTrail.list("-action_timestamp", 500),
        initialData: []
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-600" />
                    Audit Trail
                </CardTitle>
            </CardHeader>
            <CardContent>
                <DataTable
                    data={auditTrails}
                    columns={[
                        {
                            header: "Time",
                            key: "action_timestamp",
                            render: (value) => value ? new Date(value).toLocaleString() : "-"
                        },
                        { header: "User", key: "user_email" },
                        { header: "Entity", key: "entity_type" },
                        { header: "Document", key: "document_number" },
                        {
                            header: "Action",
                            key: "action_type",
                            render: (value) => <Badge variant="outline">{value || "-"}</Badge>
                        },
                        { header: "Summary", key: "change_summary" },
                        {
                            header: "Severity",
                            key: "severity",
                            render: (value) => (
                                <span className={`rounded px-2 py-1 text-xs font-semibold ${getSeverityClass(value)}`}>
                                    {value || "info"}
                                </span>
                            )
                        }
                    ]}
                    searchFields={["user_email", "entity_type", "document_number", "action_type", "change_summary"]}
                    itemsPerPage={25}
                    enableSorting={true}
                />
                {isLoading && <p className="mt-3 text-sm text-slate-500">Loading audit entries...</p>}
            </CardContent>
        </Card>
    );
}
