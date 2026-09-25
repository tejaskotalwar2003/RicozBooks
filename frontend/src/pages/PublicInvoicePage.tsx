import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Building2, 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Download, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  Smartphone,
  Wallet,
  Calendar,
  User,
  Clock,
  RefreshCw
} from 'lucide-react';
import { 
  getPublicInvoice, 
  payPublicInvoice, 
  PublicInvoiceResponse, 
  PublicInvoicePaymentResponse 
} from '../services/accountingApi';

export const PublicInvoicePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [invoice, setInvoice] = useState<PublicInvoiceResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Payment Modal & Form
  const [showPayModal, setShowPayModal] = useState<boolean>(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMode, setPayMode] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [payerName, setPayerName] = useState<string>('');
  const [payerEmail, setPayerEmail] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<PublicInvoicePaymentResponse | null>(null);

  useEffect(() => {
    if (token) {
      loadInvoice();
    }
  }, [token]);

  const loadInvoice = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPublicInvoice(token);
      setInvoice(data);
      setPayAmount(data.balance_amount.toString());
      if (data.customer_name) setPayerName(data.customer_name);
      if (data.customer_email) setPayerEmail(data.customer_email);
    } catch (err: any) {
      console.error('Failed to load invoice:', err);
      setError(err.message || 'Invoice link is invalid or has expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !invoice) return;

    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0 || amt > invoice.balance_amount) {
      alert(`Payment amount must be between 1 and ${invoice.currency} ${invoice.balance_amount}`);
      return;
    }

    setIsProcessing(true);
    try {
      const res = await payPublicInvoice(token, {
        amount: amt,
        payment_mode: payMode,
        payer_name: payerName || undefined,
        payer_email: payerEmail || undefined,
        reference_number: `${payMode}-${Date.now().toString().slice(-6)}`
      });

      setPaymentSuccess(res);
      setShowPayModal(false);
      await loadInvoice();
    } catch (err: any) {
      console.error('Payment failed:', err);
      alert(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (val: number, cur: string = 'INR') => {
    return `${cur === 'INR' ? '₹' : cur + ' '}${Number(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#C58B3E] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium text-sm">Loading secure invoice details...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Invoice Unavailable</h2>
          <p className="text-sm text-slate-600">{error || 'The requested invoice could not be found.'}</p>
          <div className="pt-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === 'PAID' || Number(invoice.balance_amount) <= 0;
  const isPartiallyPaid = invoice.status === 'PARTIALLY_PAID';

  // Construct UPI deep link
  const entityUpi = invoice.entity_upi_id || 'ricozbooks@icici';
  const upiLink = `upi://pay?pa=${encodeURIComponent(entityUpi)}&pn=${encodeURIComponent(invoice.entity_name)}&am=${invoice.balance_amount}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoice.invoice_number}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* SECURITY HEADER / BANNER */}
        <div className="flex items-center justify-between bg-white px-6 py-3.5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#260002] flex items-center justify-center text-[#EEC68B] font-black text-sm">
              R
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900">RicozBooks</span>
              <span className="text-xs text-slate-400 ml-2">Secure Customer Billing Portal</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* SUCCESS NOTIFICATION */}
        {paymentSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-sm flex items-start space-x-3 print:hidden">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold">Payment Processed Successfully!</h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                {paymentSuccess.message} Reference ID: <span className="font-mono font-semibold">{paymentSuccess.transaction_reference}</span>
              </p>
            </div>
          </div>
        )}

        {/* MAIN INVOICE CARD */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8 print:border-none print:shadow-none print:p-0">

          {/* INVOICE HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-100 pb-8">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C58B3E]">Tax Invoice</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{invoice.invoice_number}</h1>
              <div className="flex items-center gap-2 pt-1">
                {isPaid ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>PAID IN FULL</span>
                  </span>
                ) : isPartiallyPaid ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock className="w-3.5 h-3.5" />
                    <span>PARTIALLY PAID</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                    <Clock className="w-3.5 h-3.5" />
                    <span>UNPAID</span>
                  </span>
                )}
              </div>
            </div>

            {/* SELLER / ISSUER DETAILS */}
            <div className="sm:text-right space-y-1">
              <h2 className="text-lg font-bold text-slate-900">{invoice.entity_name}</h2>
              {invoice.entity_legal_name && (
                <p className="text-xs text-slate-500">{invoice.entity_legal_name}</p>
              )}
              {invoice.entity_gstin && (
                <p className="text-xs font-mono text-slate-600">GSTIN: {invoice.entity_gstin}</p>
              )}
              {invoice.entity_address && (
                <p className="text-xs text-slate-500 max-w-xs sm:ml-auto">{invoice.entity_address}</p>
              )}
            </div>
          </div>

          {/* DATES & CUSTOMER DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Billed To</span>
              <div className="mt-1 font-bold text-slate-900 text-base">{invoice.customer_name}</div>
              {invoice.customer_email && <div className="text-xs text-slate-600">{invoice.customer_email}</div>}
              {invoice.customer_phone && <div className="text-xs text-slate-600">{invoice.customer_phone}</div>}
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Invoice Date</span>
              <div className="mt-1 font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{invoice.invoice_date}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Due Date</span>
              <div className="mt-1 font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{invoice.due_date}</span>
              </div>
            </div>
          </div>

          {/* LINE ITEMS TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-2">Item & Description</th>
                  <th className="py-3 px-2 text-center">HSN/SAC</th>
                  <th className="py-3 px-2 text-right">Qty</th>
                  <th className="py-3 px-2 text-right">Unit Price</th>
                  <th className="py-3 px-2 text-right">Taxable</th>
                  <th className="py-3 px-2 text-right">Tax Rate</th>
                  <th className="py-3 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-2 font-medium text-slate-900 max-w-xs">{line.description}</td>
                    <td className="py-3.5 px-2 text-center text-xs font-mono text-slate-500">{line.hsn_sac || '-'}</td>
                    <td className="py-3.5 px-2 text-right text-slate-700">{line.quantity}</td>
                    <td className="py-3.5 px-2 text-right text-slate-700">{formatCurrency(line.unit_price, invoice.currency)}</td>
                    <td className="py-3.5 px-2 text-right text-slate-700">{formatCurrency(line.taxable_amount, invoice.currency)}</td>
                    <td className="py-3.5 px-2 text-right text-slate-700">{line.tax_rate}%</td>
                    <td className="py-3.5 px-2 text-right font-bold text-slate-900">{formatCurrency(line.total_amount, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTALS CALCULATION */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pt-4 border-t border-slate-100">
            <div className="space-y-3 max-w-sm">
              {invoice.notes && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes & Remarks</h4>
                  <p className="text-xs text-slate-600 mt-1">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Terms & Conditions</h4>
                  <p className="text-xs text-slate-600 mt-1">{invoice.terms}</p>
                </div>
              )}
            </div>

            <div className="w-full sm:w-72 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.taxable_amount, invoice.currency)}</span>
              </div>
              {Number(invoice.cgst_amount) > 0 && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>CGST:</span>
                  <span>{formatCurrency(invoice.cgst_amount, invoice.currency)}</span>
                </div>
              )}
              {Number(invoice.sgst_amount) > 0 && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>SGST:</span>
                  <span>{formatCurrency(invoice.sgst_amount, invoice.currency)}</span>
                </div>
              )}
              {Number(invoice.igst_amount) > 0 && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>IGST:</span>
                  <span>{formatCurrency(invoice.igst_amount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Amount:</span>
                <span>{formatCurrency(invoice.total_amount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                <span>Amount Paid:</span>
                <span>- {formatCurrency(invoice.paid_amount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-300">
                <span>Balance Due:</span>
                <span className="text-rose-600">{formatCurrency(invoice.balance_amount, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* ONLINE PAYMENT & UPI QR CHECKOUT SECTION */}
          {!isPaid && (
            <div className="pt-8 border-t border-slate-200 print:hidden">
              <div className="bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 rounded-2xl p-6 border border-amber-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                
                {/* UPI QR CODE DISPLAY */}
                <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                    <img 
                      src={qrCodeUrl} 
                      alt="UPI QR Code" 
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-md text-xs font-bold">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Instant UPI QR</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Scan & Pay with Any UPI App</h3>
                    <p className="text-xs text-slate-500">
                      GPay, PhonePe, Paytm, or BHIM. VPA: <span className="font-mono font-semibold text-slate-700">{entityUpi}</span>
                    </p>
                    <div className="pt-2">
                      <a
                        href={upiLink}
                        className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#C58B3E] hover:underline"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Open Directly in UPI App</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* ONLINE GATEWAY CHECKOUT BUTTON */}
                <div className="flex flex-col items-center sm:items-end gap-2 w-full md:w-auto">
                  <button
                    onClick={() => setShowPayModal(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 bg-[#260002] hover:bg-[#390003] text-[#EEC68B] font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay {formatCurrency(invoice.balance_amount, invoice.currency)} Online</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>256-bit SSL Bank-Grade Encryption</span>
                  </span>
                </div>

              </div>
            </div>
          )}

          {/* PAYMENT COMPLETED STAMP */}
          {isPaid && (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-bold text-emerald-900">This invoice has been settled in full.</h3>
              <p className="text-xs text-emerald-700">Thank you for your business!</p>
            </div>
          )}

        </div>

      </div>

      {/* ONLINE PAYMENT MODAL */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Online Invoice Settlement</h3>
                <p className="text-xs text-slate-500">Invoice #{invoice.invoice_number}</p>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMode('UPI')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      payMode === 'UPI'
                        ? 'border-[#C58B3E] bg-amber-50 text-[#C58B3E]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMode('CARD')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      payMode === 'CARD'
                        ? 'border-[#C58B3E] bg-amber-50 text-[#C58B3E]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMode('NETBANKING')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      payMode === 'NETBANKING'
                        ? 'border-[#C58B3E] bg-amber-50 text-[#C58B3E]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>NetBanking</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Amount to Pay ({invoice.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={invoice.balance_amount}
                  min="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#C58B3E] font-mono font-bold"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Remaining balance: {formatCurrency(invoice.balance_amount, invoice.currency)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Payer Name
                </label>
                <input
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Your full name or company name"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#C58B3E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Receipt Email
                </label>
                <input
                  type="email"
                  value={payerEmail}
                  onChange={(e) => setPayerEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#C58B3E]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 bg-[#260002] hover:bg-[#390003] text-[#EEC68B] font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-amber-300 border-t-transparent rounded-full animate-spin"></div>
                      <span>Authorizing Payment...</span>
                    </>
                  ) : (
                    <span>Confirm & Pay {formatCurrency(parseFloat(payAmount) || 0, invoice.currency)}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
