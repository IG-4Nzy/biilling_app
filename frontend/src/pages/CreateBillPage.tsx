import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Loader2, ChevronDown, ChevronUp, Save, FileCheck, Search } from 'lucide-react';
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
}

// Searchable product dropdown component
function ProductSearch({ products, value, onChange }: { products: any[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = products.find((p: any) => p.id === value);
  const filtered = products.filter((p: any) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase()) || (p.hsnCode || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="input text-xs py-1.5 w-full text-left flex items-center justify-between gap-1">
        <span className={selected ? 'text-white' : 'text-surface-500'}>{selected ? selected.name : 'Select product...'}</span>
        <ChevronDown className="w-3 h-3 text-surface-500 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-2xl max-h-60 overflow-hidden" style={{ position: 'absolute' }}>
          <div className="p-2 border-b border-surface-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-500" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
                className="input text-xs py-1.5 pl-7 w-full" placeholder="Search name, SKU, HSN..." />
            </div>
          </div>
          <div className="overflow-y-auto max-h-44">
            <button type="button" onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
              className="w-full px-3 py-2 text-left text-xs text-surface-400 hover:bg-surface-700 transition-colors">
              Custom item
            </button>
            {filtered.map((p: any) => (
              <button key={p.id} type="button"
                onClick={() => { onChange(p.id); setOpen(false); setSearch(''); }}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-surface-700 transition-colors flex items-center justify-between ${value === p.id ? 'bg-navy-500/10 text-navy-400' : 'text-white'}`}>
                <span>{p.name}</span>
                <span className="text-[10px] text-surface-500">{p.sku || p.hsnCode || ''}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-4 text-xs text-surface-500 text-center">No products found</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateBillPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: editId } = useParams();

  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseOrderNo, setPurchaseOrderNo] = useState('');
  const [poDate, setPoDate] = useState('');
  const [dcNo, setDcNo] = useState('');
  const [dcDate, setDcDate] = useState('');
  const [notes, setNotes] = useState('');
  const [cgstRate, setCgstRate] = useState(9);
  const [sgstRate, setSgstRate] = useState(9);
  const [showConsignee, setShowConsignee] = useState(false);
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [consigneeGstin, setConsigneeGstin] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { description: '', hsnCode: '', quantity: 1, unitPrice: 0 },
  ]);
  const [submitting, setSubmitting] = useState<'draft' | 'create' | null>(null);

  const { data: customersData } = useQuery({ queryKey: ['customers', 'all'], queryFn: () => customerService.list({ limit: 200 }) });
  const { data: productsData } = useQuery({ queryKey: ['products', 'all'], queryFn: () => productService.list({ limit: 200 }) });
  const { data: editBill } = useQuery({ queryKey: ['bill', editId], queryFn: () => billService.getById(editId!), enabled: !!editId });

  const customers = customersData?.data || [];
  const products = productsData?.data || [];

  // Populate form when editing
  useEffect(() => {
    if (editBill) {
      setCustomerId(editBill.customerId || '');
      setInvoiceDate(editBill.invoiceDate ? new Date(editBill.invoiceDate).toISOString().split('T')[0] : '');
      setPurchaseOrderNo(editBill.purchaseOrderNo || '');
      setPoDate(editBill.poDate ? new Date(editBill.poDate).toISOString().split('T')[0] : '');
      setDcNo(editBill.dcNo || '');
      setDcDate(editBill.dcDate ? new Date(editBill.dcDate).toISOString().split('T')[0] : '');
      setNotes(editBill.notes || '');
      setConsigneeName(editBill.consigneeName || '');
      setConsigneeAddress(editBill.consigneeAddress || '');
      setConsigneeGstin(editBill.consigneeGstin || '');
      if (editBill.consigneeName) setShowConsignee(true);
      // Determine CGST/SGST rates from totals
      if (editBill.subtotal > 0) {
        setCgstRate(Number(((editBill.cgstTotal / editBill.subtotal) * 100).toFixed(2)));
        setSgstRate(Number(((editBill.sgstTotal / editBill.subtotal) * 100).toFixed(2)));
      }
      if (editBill.items?.length) {
        setItems(editBill.items.map((i: any) => ({
          productId: i.productId || undefined,
          description: i.description,
          hsnCode: i.hsnCode || '',
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })));
      }
    }
  }, [editBill]);

  // Add new item on TOP; only allow one empty/unselected item at a time
  const addItem = () => {
    const hasEmpty = items.some(i => !i.productId && !i.description);
    if (hasEmpty) { toast.error('Fill the current empty item first'); return; }
    setItems([{ description: '', hsnCode: '', quantity: 1, unitPrice: 0 }, ...items]);
  };

  const removeItem = (i: number) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const selectProduct = (index: number, productId: string) => {
    if (!productId) {
      const updated = [...items];
      updated[index] = { description: '', hsnCode: '', quantity: 1, unitPrice: 0 };
      setItems(updated);
      return;
    }
    const product = products.find((p: any) => p.id === productId);
    if (product) {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        productId: product.id,
        description: product.name,
        hsnCode: product.hsnCode || '',
        unitPrice: Number(product.unitPrice) || 0,
      };
      setItems(updated);
    }
  };

  // GST on subtotal only
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const cgstTotal = subtotal * (cgstRate / 100);
  const sgstTotal = subtotal * (sgstRate / 100);
  const taxTotal = cgstTotal + sgstTotal;
  const grandTotal = subtotal + taxTotal;

  const handleSubmit = async (status: 'DRAFT' | 'UNPAID') => {
    if (!customerId) { toast.error('Please select a customer'); return; }
    if (items.some(i => !i.description || i.unitPrice <= 0)) { toast.error('Fill all item details'); return; }

    setSubmitting(status === 'DRAFT' ? 'draft' : 'create');
    try {
      const payload: any = {
        customerId,
        invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : undefined,
        purchaseOrderNo: purchaseOrderNo || undefined,
        poDate: poDate ? new Date(poDate).toISOString() : undefined,
        dcNo: dcNo || undefined,
        dcDate: dcDate ? new Date(dcDate).toISOString() : undefined,
        consigneeName: consigneeName || undefined,
        consigneeAddress: consigneeAddress || undefined,
        consigneeGstin: consigneeGstin || undefined,
        items: items.map(i => ({
          productId: i.productId,
          description: i.description,
          hsnCode: i.hsnCode || undefined,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxRate: cgstRate + sgstRate,
        })),
        notes: notes || undefined,
        cgstRate,
        sgstRate,
      };

      if (editId) {
        await billService.update(editId, payload);
      } else {
        await billService.create({ ...payload, status });
      }
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(editId ? 'Invoice updated!' : status === 'DRAFT' ? 'Draft saved!' : 'Invoice created!');
      navigate('/bills');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed');
    } finally { setSubmitting(null); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/bills')} className="btn-icon"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold text-white">{editId ? 'Edit Invoice' : 'Create Invoice'}</h1>
          <p className="text-sm text-surface-400">GST Tax Invoice — CGST + SGST on total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wide">Invoice Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Invoice Date *</label><input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="input text-sm" /></div>
            <div><label className="label">Purchase Order No</label><input type="text" value={purchaseOrderNo} onChange={(e) => setPurchaseOrderNo(e.target.value)} className="input text-sm" placeholder="PO Number" /></div>
            <div><label className="label">P.O. Date</label><input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className="input text-sm" /></div>
            <div><label className="label">DC No</label><input type="text" value={dcNo} onChange={(e) => setDcNo(e.target.value)} className="input text-sm" placeholder="DC Number" /></div>
            <div><label className="label">DC Date</label><input type="date" value={dcDate} onChange={(e) => setDcDate(e.target.value)} className="input text-sm" /></div>
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wide">Billed To</h3>
          <div>
            <label className="label">Select Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input text-sm">
              <option value="">-- Select customer --</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.gstin ? ` — ${c.gstin}` : ''}</option>)}
            </select>
          </div>
          {customerId && (() => {
            const sc = customers.find((c: any) => c.id === customerId);
            if (!sc) return null;
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

      {/* Consignee */}
      <div className="glass-card p-5">
        <button onClick={() => setShowConsignee(!showConsignee)} className="flex items-center justify-between w-full text-sm font-semibold text-surface-300 uppercase tracking-wide">
          <span>Shipped To (Consignee)</span>
          {showConsignee ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showConsignee && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div><label className="label">Name</label><input type="text" value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} className="input text-sm" /></div>
            <div className="md:col-span-2"><label className="label">Address</label><input type="text" value={consigneeAddress} onChange={(e) => setConsigneeAddress(e.target.value)} className="input text-sm" /></div>
            <div><label className="label">GSTIN</label><input type="text" value={consigneeGstin} onChange={(e) => setConsigneeGstin(e.target.value)} className="input text-sm" /></div>
          </motion.div>
        )}
      </div>

      {/* GST Rate */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wide mb-3">GST Rate (applied on subtotal)</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-surface-400">CGST %</label>
            <input type="number" value={cgstRate || ''} onChange={(e) => setCgstRate(parseFloat(e.target.value) || 0)}
              onFocus={(e) => e.target.select()} className="input w-20 text-sm text-center py-1.5" min="0" max="50" step="0.5" />
          </div>
          <span className="text-surface-600">+</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-surface-400">SGST %</label>
            <input type="number" value={sgstRate || ''} onChange={(e) => setSgstRate(parseFloat(e.target.value) || 0)}
              onFocus={(e) => e.target.select()} className="input w-20 text-sm text-center py-1.5" min="0" max="50" step="0.5" />
          </div>
          <span className="text-surface-600">=</span>
          <span className="text-sm font-bold text-accent-400">{cgstRate + sgstRate}% GST</span>
        </div>
      </div>

      {/* Line Items */}
      <div className="glass-card p-5" style={{ overflow: 'visible' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wide">Line Items</h3>
          <button onClick={addItem} className="btn-secondary text-sm py-1.5"><Plus className="w-4 h-4" /> Add Item</button>
        </div>

        <div className="hidden lg:grid grid-cols-12 gap-2 text-[10px] font-semibold text-surface-500 uppercase px-1 mb-2">
          <div className="col-span-3">Product</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-1">HSN</div>
          <div className="col-span-1">Price</div>
          <div className="col-span-1">Qty</div>
          <div className="col-span-1">Gross</div>
          <div className="col-span-1"></div>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => {
            const gross = item.quantity * item.unitPrice;
            return (
              <motion.div key={idx} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-2 p-3 bg-surface-800/30 rounded-lg items-center">
                <div className="lg:col-span-3">
                  <ProductSearch products={products} value={item.productId || ''} onChange={(id) => selectProduct(idx, id)} />
                </div>
                <div className="lg:col-span-3">
                  <input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className="input text-xs py-1.5" placeholder="Description" />
                </div>
                <div className="lg:col-span-1">
                  <input value={item.hsnCode} onChange={(e) => updateItem(idx, 'hsnCode', e.target.value)} className="input text-xs py-1.5" placeholder="HSN" />
                </div>
                <div className="lg:col-span-1">
                  <input type="number" value={item.unitPrice || ''} onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()} placeholder="0" className="input text-xs py-1.5" min="0" step="0.01" />
                </div>
                <div className="lg:col-span-1">
                  <input type="number" value={item.quantity || ''} onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()} placeholder="1" className="input text-xs py-1.5 text-center" min="0.01" step="1" />
                </div>
                <div className="lg:col-span-1 text-xs text-white font-medium text-center">{formatCurrency(gross)}</div>
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

      {/* Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-surface-300 mb-3 uppercase tracking-wide">Notes</h3>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-[100px] resize-none text-sm" placeholder="Additional notes..." />
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-surface-300 mb-4 uppercase tracking-wide">Tax Summary</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm"><span className="text-surface-400">Subtotal (all items)</span><span className="text-white font-medium">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-surface-400">CGST @ {cgstRate}%</span><span className="text-white">{formatCurrency(cgstTotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-surface-400">SGST @ {sgstRate}%</span><span className="text-white">{formatCurrency(sgstTotal)}</span></div>
            <div className="flex justify-between text-sm text-surface-400"><span>Total GST</span><span>{formatCurrency(taxTotal)}</span></div>
            <div className="border-t border-surface-700 pt-3 flex justify-between">
              <span className="text-base font-semibold text-white">Grand Total</span>
              <span className="text-xl font-bold text-accent-400">{formatCurrency(grandTotal)}</span>
            </div>
            {grandTotal > 0 && <p className="text-[10px] text-surface-500 italic mt-1">{amountToWords(grandTotal)}</p>}
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => navigate('/bills')} className="btn-secondary flex-1 text-sm">Cancel</button>
            <button onClick={() => handleSubmit('DRAFT')} disabled={!!submitting || !customerId}
              className="btn-secondary flex-1 text-sm !border-navy-500/30 !text-navy-400 hover:!bg-navy-500/10">
              {submitting === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Draft</>}
            </button>
            <button onClick={() => handleSubmit('UNPAID')} disabled={!!submitting || !customerId} className="btn-primary flex-1 text-sm">
              {submitting === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileCheck className="w-4 h-4" /> Create Invoice</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
