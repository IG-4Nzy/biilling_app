import { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { billService, companyService } from '../services/api';
import { amountToWords } from '@billing/shared';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtCurrency(val: number) {
  return val.toFixed(2);
}

export default function InvoicePreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: bill, isLoading } = useQuery({
    queryKey: ['bill', id],
    queryFn: () => billService.getById(id!),
    enabled: !!id,
  });

  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: companyService.get,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-navy-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="text-center py-20 text-surface-400">
        <p>Invoice not found</p>
      </div>
    );
  }

  return (
    <div>
      {/* Action bar — hidden in print */}
      <div className="flex items-center gap-3 mb-6 no-print">
        <button onClick={() => navigate('/bills')} className="btn-icon">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{bill.invoiceNumber}</h1>
          <p className="text-xs text-surface-400">Invoice Preview</p>
        </div>
        <button onClick={handlePrint} className="btn-primary text-sm">
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      {/* Invoice — printable area */}
      <div ref={printRef} id="invoice-print"
        className="bg-white text-black max-w-[210mm] mx-auto shadow-xl"
        style={{ fontFamily: "'Times New Roman', serif", fontSize: '11px', lineHeight: '1.4', minHeight: '297mm' }}>
        <div className="p-6">

          {/* ─── HEADER ─── */}
          <div className="border-b-2 border-black pb-3 mb-2">
            <div className="flex items-center gap-4">
              {company?.logoPath && (
                <img src={company.logoPath} alt="Logo" className="w-16 h-16 object-contain" />
              )}
              <div className={company?.logoPath ? 'flex-1' : 'flex-1 text-center'}>
                <h1 className="text-xl font-bold tracking-wide">{company?.name || 'Company Name'}</h1>
                <p className="text-[10px]">{company?.address || ''}</p>
                <p className="text-[10px]">{company?.city || ''} - {company?.pincode || ''}</p>
                {company?.regNo && <p className="text-[10px]">Reg.No. {company.regNo} {company.factoryRegNo ? `Factories Reg No. ${company.factoryRegNo}` : ''}</p>}
                <p className="text-[10px]">Phone: {company?.phone || ''}, mobile: {company?.mobile || ''} E-mail: {company?.email || ''}</p>
              </div>
            </div>
            <p className="font-bold text-sm mt-1 text-center">INVOICE CASH/CREDIT BILL &nbsp;&nbsp;&nbsp; GSTIN: {company?.gstin || ''}</p>
          </div>

          {/* ─── INVOICE META ─── */}
          <table className="w-full text-[10px] border border-black mb-1" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1 w-1/4">Invoice no: <strong>{bill.invoiceNumber}</strong></td>
                <td className="border border-black px-2 py-1 w-1/4">Invoice Date: <strong>{formatDate(bill.invoiceDate || bill.createdAt)}</strong></td>
                <td className="border border-black px-2 py-1 w-1/4">Purchase Order No: <strong>{bill.purchaseOrderNo || ''}</strong></td>
                <td className="border border-black px-2 py-1 w-1/4">P.O. Date: <strong>{formatDate(bill.poDate)}</strong></td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1">State Code: <strong>{bill.customer?.stateCode || ''}</strong></td>
                <td className="border border-black px-2 py-1" colSpan={2}>DC No: <strong>{bill.dcNo || ''}</strong></td>
                <td className="border border-black px-2 py-1">DC Date: <strong>{formatDate(bill.dcDate)}</strong></td>
              </tr>
            </tbody>
          </table>

          {/* ─── BILLED TO / SHIPPED TO ─── */}
          <table className="w-full text-[10px] border border-black mb-1" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1 align-top w-1/2" rowSpan={2}>
                  <strong>Details of Receiver / Billed to:</strong><br />
                  Name&nbsp;&nbsp;&nbsp;&nbsp;: {bill.customer?.name}<br />
                  Address: {bill.customer?.address || ''}
                </td>
                <td className="border border-black px-2 py-1 align-top w-1/2" rowSpan={2}>
                  <strong>Details of Consignee / Shipped to:</strong><br />
                  Name&nbsp;&nbsp;&nbsp;&nbsp;: {bill.consigneeName || bill.customer?.name}<br />
                  Address: {bill.consigneeAddress || bill.customer?.address || ''}
                </td>
              </tr>
            </tbody>
          </table>
          <table className="w-full text-[10px] border border-black mb-2" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1 w-1/4">GSTIN: <strong>{bill.customer?.gstin || ''}</strong></td>
                <td className="border border-black px-2 py-1 w-1/4">State Code: <strong>{bill.customer?.stateCode || ''}</strong></td>
                <td className="border border-black px-2 py-1 w-1/4">GSTIN: <strong>{bill.consigneeGstin || ''}</strong></td>
                <td className="border border-black px-2 py-1 w-1/4">State Code: <strong>{bill.consigneeStateCode || ''}</strong></td>
              </tr>
            </tbody>
          </table>

          {/* ─── LINE ITEMS TABLE ─── */}
          <table className="w-full text-[10px] border border-black mb-2" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-1 py-1 text-center w-8" rowSpan={2}>No</th>
                <th className="border border-black px-1 py-1 text-left" rowSpan={2}>Name of product/service</th>
                <th className="border border-black px-1 py-1 text-center w-16" rowSpan={2}>Code</th>
                <th className="border border-black px-1 py-1 text-center w-14" rowSpan={2}>Unit price</th>
                <th className="border border-black px-1 py-1 text-center w-10" rowSpan={2}>Qty</th>
                <th className="border border-black px-1 py-1 text-center w-16" rowSpan={2}>Gross value</th>
                <th className="border border-black px-1 py-1 text-center" colSpan={2}>CGST</th>
                <th className="border border-black px-1 py-1 text-center" colSpan={2}>SGST</th>
                <th className="border border-black px-1 py-1 text-center w-16" rowSpan={2}>Grand Total</th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-black px-1 py-0.5 text-center text-[9px] w-10">Rate</th>
                <th className="border border-black px-1 py-0.5 text-center text-[9px] w-14">Amount</th>
                <th className="border border-black px-1 py-0.5 text-center text-[9px] w-10">Rate</th>
                <th className="border border-black px-1 py-0.5 text-center text-[9px] w-14">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.items?.map((item: any, i: number) => (
                <tr key={item.id}>
                  <td className="border border-black px-1 py-1 text-center">{i + 1}</td>
                  <td className="border border-black px-2 py-1">{item.description}</td>
                  <td className="border border-black px-1 py-1 text-center">{item.hsnCode || ''}</td>
                  <td className="border border-black px-1 py-1 text-right">{fmtCurrency(item.unitPrice)}</td>
                  <td className="border border-black px-1 py-1 text-center">{String(item.quantity).replace(/\.0+$/, '')}</td>
                  <td className="border border-black px-1 py-1 text-right">{fmtCurrency(item.grossValue)}</td>
                  <td className="border border-black px-1 py-1 text-center">{item.cgstRate}%</td>
                  <td className="border border-black px-1 py-1 text-right">{fmtCurrency(item.grossValue * (item.cgstRate / 100))}</td>
                  <td className="border border-black px-1 py-1 text-center">{item.sgstRate}%</td>
                  <td className="border border-black px-1 py-1 text-right">{fmtCurrency(item.grossValue * (item.sgstRate / 100))}</td>
                  <td className="border border-black px-1 py-1 text-right">{fmtCurrency(item.grossValue + item.grossValue * ((item.cgstRate + item.sgstRate) / 100))}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="font-bold">
                <td className="border border-black px-1 py-1" colSpan={5}></td>
                <td className="border border-black px-1 py-1 text-right">{fmtCurrency(bill.subtotal)}</td>
                <td className="border border-black px-1 py-1 text-center">{bill.items?.[0]?.cgstRate || 0}%</td>
                <td className="border border-black px-1 py-1 text-right">{fmtCurrency(bill.cgstTotal)}</td>
                <td className="border border-black px-1 py-1 text-center">{bill.items?.[0]?.sgstRate || 0}%</td>
                <td className="border border-black px-1 py-1 text-right">{fmtCurrency(bill.sgstTotal)}</td>
                <td className="border border-black px-1 py-1 text-right">{fmtCurrency(bill.grandTotal)}</td>
              </tr>
            </tbody>
          </table>

          {/* ─── GRAND TOTAL BOX ─── */}
          <table className="w-full text-[10px] border border-black mb-2" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1 text-right font-bold w-3/4">Total</td>
                <td className="border border-black px-2 py-1 text-right font-bold w-1/4">{fmtCurrency(bill.grandTotal)}</td>
              </tr>
            </tbody>
          </table>

          {/* ─── AMOUNT IN WORDS ─── */}
          <div className="text-[10px] mb-1">
            <strong>Total Rupees:</strong> {amountToWords(bill.grandTotal)}
          </div>

          {/* ─── TAX BREAKDOWN ─── */}
          <table className="text-[9px] border border-black mb-4" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1">Add : CGST :{fmtCurrency(bill.cgstTotal)}</td>
                <td className="border border-black px-2 py-1">Add : SGST :{fmtCurrency(bill.sgstTotal)}</td>
                <td className="border border-black px-2 py-1">Tax Amount of GST :{fmtCurrency(bill.taxTotal)}</td>
              </tr>
            </tbody>
          </table>

          {/* ─── FOOTER ─── */}
          <div className="flex justify-between items-start mt-6">
            <div className="text-[9px] space-y-1">
              <p className="italic">Certified that particulars given above are true and correct</p>
              {company?.bankAccount && (
                <div className="mt-2">
                  <p><strong>Bank details-</strong> {company.name}</p>
                  <p><strong>A/C NO-</strong> {company.bankAccount}</p>
                  <p><strong>IFS CODE</strong> : {company.bankIfsc}</p>
                  <p><strong>Bank Name</strong> : {company.bankName}, {company.bankBranch}</p>
                </div>
              )}
            </div>
            <div className="text-right text-[10px]">
              <p>for {company?.name || 'Company'}</p>
              <div className="h-14" />
              <p className="font-bold">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
