import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Loader2, ChevronDown, ChevronUp, Save, FileCheck } from 'lucide-react';
import { billService, customerService, productService } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { amountToWords } from '@billing/shared';
import toast from 'react-hot-toast';

interface LineItem {
  productId?: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export default function CreateBillPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseOrderNo, setPurchaseOrderNo] = useState('');
  const [poDate, setPoDate] = useState('');
  const [dcNo, setDcNo] = useState('');
  const [dcDate, setDcDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showConsignee, setShowConsignee] = useState(false);
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [consigneeGstin, setConsigneeGstin] = useState('');
  const [consigneeState, setConsigneeState] = useState('');
  const [consigneeStateCode, setConsigneeStateCode] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { description: '', hsnCode: '', quantity: 1, unitPrice: 0, taxRate: 18 },
  ]);
  const [submitting, setSubmitting] = useState<'draft' | 'create' | null>(null);

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => customerService.list({ limit: 200 }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => productService.list({ limit: 200 }),
  });

  const customers = customersData?.data || [];
  const products = productsData?.data || [];

  const addItem = () => {
    setItems([...items, { description: '', hsnCode: '', quantity: 1, unitPrice: 0, taxRate: 18 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    if (product) {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        productId: product.id,
        description: product.name,
        hsnCode: product.hsnCode || '',
        unitPrice: product.unitPrice,
        taxRate: product.taxRate,
      };
      setItems(updated);
    }
  };

  // CGST + SGST calculations (always 50/50 split, no IGST)
  const calcLine = (item: LineItem) => {
    const gross = item.quantity * item.unitPrice;
    const halfRate = item.taxRate / 2;
    const cgstAmount = gross * (halfRate / 100);
    const sgstAmount = gross * (halfRate / 100);
    return {
      gross,
      cgstRate: halfRate,
      cgstAmount,
      sgstRate: halfRate,
      sgstAmount,
      total: gross + cgstAmount + sgstAmount,
    };
  };

  const subtotal = items.reduce((sum, item) => sum + calcLine(item).gross, 0);
  const cgstTotal = items.reduce((sum, item) => sum + calcLine(item).cgstAmount, 0);
  const sgstTotal = items.reduce((sum, item) => sum + calcLine(item).sgstAmount, 0);
  const taxTotal = cgstTotal + sgstTotal;
  const grandTotal = subtotal + taxTotal;

  const buildPayload = () => ({
    customerId,
    invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : undefined,
    purchaseOrderNo: purchaseOrderNo || undefined,
    poDate: poDate ? new Date(poDate).toISOString() : undefined,
    dcNo: dcNo || undefined,
    dcDate: dcDate ? new Date(dcDate).toISOString() : undefined,
    consigneeName: consigneeName || undefined,
    consigneeAddress: consigneeAddress || undefined,
    consigneeGstin: consigneeGstin || undefined,
    consigneeState: consigneeState || undefined,
    consigneeStateCode: consigneeStateCode || undefined,
    items: items.map(i => ({
      productId: i.productId,
      description: i.description,
      hsnCode: i.hsnCode || undefined,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      taxRate: i.taxRate,
    })),
    notes: notes || undefined,
  });

  const handleSubmit = async (status: 'DRAFT' | 'UNPAID') => {
    if (!customerId) { toast.error('Please select a customer'); return; }
    if (items.some(i => !i.description || i.unitPrice <= 0)) {
      toast.error('Please fill in all item details'); return;
    }

    setSubmitting(status === 'DRAFT' ? 'draft' : 'create');
    try {
      await billService.create({ ...buildPayload(), status });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(status === 'DRAFT' ? 'Draft saved!' : 'Invoice created!');
      navigate('/bills');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create invoice');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/bills')} className="btn-icon">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Create Invoice</h1>
          <p className="text-sm text-surface-400">GST Tax Invoice — CGST + SGST</p>
        </div>
      </div>

      {/* Invoice Details & Customer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Info */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wide">Invoice Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Invoice Date *</label>
              <input type="date" value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="input text-sm" id="invoice-date" />
            </div>
            <div>
              <label className="label">Purchase Order No</label>
              <input type="text" value={purchaseOrderNo}
                onChange={(e) => setPurchaseOrderNo(e.target.value)}
                className="input text-sm" placeholder="CO/SCD/0159" />
            </div>
            <div>
              <label className="label">P.O. Date</label>
              <input type="date" value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                className="input text-sm" />
            </div>
            <div>
              <label className="label">DC No</label>
              <input type="text" value={dcNo}
                onChange={(e) => setDcNo(e.target.value)}
                className="input text-sm" placeholder="DC Number" />
            </div>
            <div>
              <label className="label">DC Date</label>
              <input type="date" value={dcDate}
                onChange={(e) => setDcDate(e.target.value)}
                className="input text-sm" />
            </div>
          </div>
        </div>

        {/* Customer (Billed To) */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wide">Billed To (Receiver)</h3>
          <div>
            <label className="label">Select Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
              className="input text-sm" id="customer-select">
              <option value="">-- Select customer --</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}{c.gstin ? ` — ${c.gstin}` : ''}</option>
              ))}
            </select>
          </div>
          {customerId && customers.find((c: any) => c.id === customerId) && (() => {
            const sc = customers.find((c: any) => c.id === customerId);
            return (
              <div className="text-xs text-surface-400 space-y-1 p-3 bg-surface-800/40 rounded-lg">
                <p><span className="text-surface-500">Name:</span> <span className="text-white">{sc.name}</span></p>
                {sc.address && <p><span className="text-surface-500">Address:</span> {sc.address}</p>}
                {sc.gstin && <p><span className="text-surface-500">GSTIN:</span> {sc.gstin}</p>}
                {sc.state && <p><span className="text-surface-500">State:</span> {sc.state} ({sc.stateCode})</p>}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Consignee (Shipped To) — Collapsible */}
      <div className="glass-card p-5">
        <button onClick={() => setShowConsignee(!showConsignee)}
          className="flex items-center justify-between w-full text-sm font-semibold text-surface-300 uppercase tracking-wide">
          <span>Shipped To (Consignee) — if different from receiver</span>
          {showConsignee ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showConsignee && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div>
              <label className="label">Name</label>
              <input type="text" value={consigneeName}
                onChange={(e) => setConsigneeName(e.target.value)}
                className="input text-sm" placeholder="Consignee name" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input type="text" value={consigneeAddress}
                onChange={(e) => setConsigneeAddress(e.target.value)}
                className="input text-sm" placeholder="Consignee address" />
            </div>
            <div>
              <label className="label">GSTIN</label>
              <input type="text" value={consigneeGstin}
                onChange={(e) => setConsigneeGstin(e.target.value)}
                className="input text-sm" placeholder="GSTIN" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Line Items */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wide">Line Items</h3>
          <button onClick={addItem} className="btn-secondary text-sm py-1.5" id="add-item-btn">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        {/* Header */}
        <div className="hidden lg:grid grid-cols-12 gap-2 text-[10px] font-semibold text-surface-500 uppercase px-1 mb-2">
          <div className="col-span-2">Product</div>
          <div className="col-span-2">Description</div>
          <div className="col-span-1">HSN</div>
          <div className="col-span-1">Price</div>
          <div className="col-span-1">Qty</div>
          <div className="col-span-1">Gross</div>
          <div className="col-span-1">GST %</div>
          <div className="col-span-1">CGST</div>
          <div className="col-span-1">SGST</div>
          <div className="col-span-1"></div>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => {
            const line = calcLine(item);
            return (
              <motion.div key={idx}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-2 p-3 bg-surface-800/30 rounded-lg items-center">
                <div className="lg:col-span-2">
                  <select value={item.productId || ''}
                    onChange={(e) => selectProduct(idx, e.target.value)}
                    className="input text-xs py-1.5">
                    <option value="">Custom item</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <input value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    className="input text-xs py-1.5" placeholder="Description" />
                </div>
                <div className="lg:col-span-1">
                  <input value={item.hsnCode}
                    onChange={(e) => updateItem(idx, 'hsnCode', e.target.value)}
                    className="input text-xs py-1.5" placeholder="HSN" />
                </div>
                <div className="lg:col-span-1">
                  <input type="number" value={item.unitPrice || ''}
                    onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="input text-xs py-1.5" min="0" step="0.01" />
                </div>
                <div className="lg:col-span-1">
                  <input type="number" value={item.quantity || ''}
                    onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    placeholder="1"
                    className="input text-xs py-1.5 text-center" min="0.01" step="1" />
                </div>
                <div className="lg:col-span-1 text-xs text-white font-medium text-right lg:text-center">
                  {formatCurrency(line.gross)}
                </div>
                <div className="lg:col-span-1">
                  <input type="number" value={item.taxRate || ''}
                    onChange={(e) => updateItem(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    placeholder="18"
                    className="input text-xs py-1.5 text-center" min="0" max="100" />
                </div>
                <div className="lg:col-span-1 text-xs text-surface-400 text-right lg:text-center">
                  <span className="text-[9px] text-surface-500">{line.cgstRate}%</span> {formatCurrency(line.cgstAmount)}
                </div>
                <div className="lg:col-span-1 text-xs text-surface-400 text-right lg:text-center">
                  <span className="text-[9px] text-surface-500">{line.sgstRate}%</span> {formatCurrency(line.sgstAmount)}
                </div>
                <div className="lg:col-span-1 flex justify-center">
                  <button onClick={() => removeItem(idx)} className="btn-icon" disabled={items.length <= 1}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Summary & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-surface-300 mb-3 uppercase tracking-wide">Notes</h3>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            className="input min-h-[100px] resize-none text-sm"
            placeholder="Additional notes for this invoice..." id="bill-notes" />
        </div>

        {/* Tax Summary */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-surface-300 mb-4 uppercase tracking-wide">Tax Summary</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">Subtotal</span>
              <span className="text-white font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">CGST</span>
              <span className="text-white">{formatCurrency(cgstTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">SGST</span>
              <span className="text-white">{formatCurrency(sgstTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-surface-400">
              <span>Tax Amount of GST</span>
              <span>{formatCurrency(taxTotal)}</span>
            </div>
            <div className="border-t border-surface-700 pt-3 flex justify-between">
              <span className="text-base font-semibold text-white">Grand Total</span>
              <span className="text-xl font-bold text-accent-400">{formatCurrency(grandTotal)}</span>
            </div>
            {grandTotal > 0 && (
              <p className="text-[10px] text-surface-500 italic mt-1">
                {amountToWords(grandTotal)}
              </p>
            )}
          </div>

          {/* Action Buttons: Save Draft + Create Invoice */}
          <div className="flex gap-3 mt-6">
            <button onClick={() => navigate('/bills')} className="btn-secondary flex-1 text-sm">
              Cancel
            </button>
            <button onClick={() => handleSubmit('DRAFT')}
              disabled={!!submitting || !customerId}
              className="btn-secondary flex-1 text-sm !border-navy-500/30 !text-navy-400 hover:!bg-navy-500/10" id="save-draft-btn">
              {submitting === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Draft</>}
            </button>
            <button onClick={() => handleSubmit('UNPAID')}
              disabled={!!submitting || !customerId}
              className="btn-primary flex-1 text-sm" id="create-invoice-btn">
              {submitting === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileCheck className="w-4 h-4" /> Create Invoice</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
