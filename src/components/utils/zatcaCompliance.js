const escapeXml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const base64FromBytes = (bytes) => {
    if (typeof window === "undefined" || !window.btoa) {
        return "";
    }
    return window.btoa(String.fromCharCode(...bytes));
};

const tlvSegment = (tag, value) => {
    const encoded = new TextEncoder().encode(String(value ?? ""));
    return [tag, encoded.length, ...encoded];
};

export const getInvoiceIssueDateTime = (invoice) => {
    const date = invoice.invoice_date || new Date().toISOString().split("T")[0];
    return invoice.issue_time ? `${date}T${invoice.issue_time}` : `${date}T00:00:00`;
};

export const generateZatcaQrPayload = (invoice, config) => {
    const sellerName = config?.organization_name || invoice.seller_name || "HORIZON";
    const vatNumber = config?.vat_registration_number || invoice.seller_vat_number || "";
    const issueDateTime = getInvoiceIssueDateTime(invoice);
    const totalAmount = Number(invoice.total_amount || 0).toFixed(2);
    const vatAmount = Number(invoice.vat_amount ?? invoice.tax_amount ?? 0).toFixed(2);

    const bytes = [
        ...tlvSegment(1, sellerName),
        ...tlvSegment(2, vatNumber),
        ...tlvSegment(3, issueDateTime),
        ...tlvSegment(4, totalAmount),
        ...tlvSegment(5, vatAmount)
    ];

    return base64FromBytes(bytes);
};

export const generateInvoiceHash = async (payload) => {
    const value = typeof payload === "string" ? payload : JSON.stringify(payload || {});
    const bytes = new TextEncoder().encode(value);

    if (typeof crypto !== "undefined" && crypto.subtle) {
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        return base64FromBytes([...new Uint8Array(digest)]);
    }

    return base64FromBytes(bytes).slice(0, 44);
};

export const getZatcaSubmissionMethod = (invoice) => {
    const invoiceType = invoice.invoice_type || "standard";
    return invoiceType === "simplified" ? "reporting" : "clearance";
};

export const validateZatcaInvoice = (invoice, config) => {
    const errors = [];
    const warnings = [];
    const invoiceType = invoice.invoice_type || "standard";

    if (!config) errors.push("Active ZATCA configuration is required.");
    if (!config?.vat_registration_number) errors.push("Seller VAT registration number is missing.");
    if (!invoice.invoice_number) errors.push("Invoice number is required.");
    if (!invoice.invoice_date) errors.push("Invoice date is required.");
    if (!invoice.customer_name) errors.push("Customer name is required.");
    if (invoiceType === "standard" && !invoice.customer_vat_number) {
        warnings.push("Customer VAT number is recommended for standard tax invoices.");
    }
    if (Number(invoice.total_amount || 0) <= 0) errors.push("Invoice total must be greater than zero.");
    if (Number(invoice.tax_percent ?? invoice.vat_percent ?? 15) !== 15) {
        warnings.push("VAT rate is not 15%. Confirm this invoice is zero-rated, exempt, or outside scope.");
    }
    if ((invoiceType === "credit_note" || invoiceType === "debit_note") && !invoice.original_invoice_number) {
        errors.push("Credit/debit notes must reference the original invoice.");
    }

    return {
        valid: errors.length === 0,
        status: errors.length > 0 ? "fail" : warnings.length > 0 ? "pass_with_warning" : "pass",
        errors,
        warnings
    };
};

export const buildZatcaInvoiceXml = ({ invoice, config, qrPayload, invoiceHash }) => {
    const invoiceType = invoice.invoice_type || "standard";
    const taxAmount = Number(invoice.vat_amount ?? invoice.tax_amount ?? 0).toFixed(2);
    const taxableAmount = Number(invoice.subtotal ?? invoice.line_extension_amount ?? 0).toFixed(2);
    const totalAmount = Number(invoice.total_amount || 0).toFixed(2);

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(invoice.invoice_number)}</cbc:ID>
  <cbc:UUID>${escapeXml(invoice.zatca_uuid || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `UUID-${Date.now()}`))}</cbc:UUID>
  <cbc:IssueDate>${escapeXml(invoice.invoice_date)}</cbc:IssueDate>
  <cbc:IssueTime>${escapeXml(invoice.issue_time || "00:00:00")}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${invoiceType === "simplified" ? "0200000" : "0100000"}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(config?.vat_registration_number)}</cbc:CompanyID>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(config?.organization_name || "HORIZON")}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(invoice.customer_vat_number || "")}</cbc:CompanyID>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(invoice.customer_name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${taxAmount}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${taxableAmount}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${taxableAmount}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${totalAmount}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${totalAmount}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:AdditionalDocumentReference>
    <cbc:ID>QR</cbc:ID>
    <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${escapeXml(qrPayload)}</cbc:EmbeddedDocumentBinaryObject>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${escapeXml(invoiceHash)}</cbc:EmbeddedDocumentBinaryObject>
  </cac:AdditionalDocumentReference>
</Invoice>`;
};
