import { useState, type ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, ReceiptText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { ApiError, api } from '@/lib/api'

interface InvoiceDialogProps {
  paymentId: string
  trigger: ReactElement
}

export function InvoiceDialog({ paymentId, trigger }: InvoiceDialogProps) {
  const { accessToken } = useAuth()
  const [open, setOpen] = useState(false)

  const query = useQuery({
    queryKey: ['invoice', paymentId],
    queryFn: ({ signal }) => api.getInvoice(paymentId, accessToken!, signal),
    enabled: open && Boolean(accessToken),
    retry: false,
  })

  const invoice = query.data?.data.invoice

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ReceiptText className="size-4" /> Invoice</DialogTitle>
          <DialogDescription>A record of this consultation's payment, for your reference.</DialogDescription>
        </DialogHeader>

        {query.isLoading ? (
          <div className="space-y-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-24 w-full" /></div>
        ) : query.isError ? (
          <p className="text-sm text-destructive">{query.error instanceof ApiError ? query.error.message : 'This invoice could not be loaded.'}</p>
        ) : invoice ? (
          <>
            <div id="invoice-printable" className="rounded-lg border p-4 text-sm">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-heading text-base font-semibold">CaseJeeto</p>
                  <p className="text-xs text-muted-foreground">Invoice {invoice.invoiceId}</p>
                </div>
                <p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(invoice.date))}</p>
              </div>

              <dl className="mt-3 grid gap-2">
                <div className="flex justify-between"><dt className="text-muted-foreground">Advocate</dt><dd className="font-medium">{invoice.lawyer.name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Consultation date</dt><dd className="font-medium">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(invoice.booking.scheduledAt))}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Duration</dt><dd className="font-medium">{invoice.booking.durationMinutes} minutes</dd></div>
              </dl>

              <div className="mt-4 border-t pt-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Consultation fee</span><span>₹{invoice.payment.consultationFeeInRupees.toLocaleString('en-IN')}</span></div>
                <div className="mt-1 flex justify-between text-sm"><span className="text-muted-foreground">Platform fee</span><span>₹{invoice.payment.platformFeeInRupees.toLocaleString('en-IN')}</span></div>
                <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold"><span>Total paid</span><span>₹{invoice.payment.consultationFeeInRupees.toLocaleString('en-IN')}</span></div>
                {invoice.payment.refundAmountInRupees > 0 && (
                  <div className="mt-1 flex justify-between text-sm text-muted-foreground"><span>Refunded</span><span>₹{invoice.payment.refundAmountInRupees.toLocaleString('en-IN')}</span></div>
                )}
              </div>

              <p className="mt-4 text-[0.65rem] text-muted-foreground">Payment ID: {invoice.payment._id}{invoice.payment.razorpayPaymentId ? ` · Razorpay ref: ${invoice.payment.razorpayPaymentId}` : ''}</p>
            </div>

            <style>{`
              @media print {
                body * { visibility: hidden; }
                #invoice-printable, #invoice-printable * { visibility: visible; }
                #invoice-printable { position: fixed; inset: 0; border: none; padding: 1.5rem; }
              }
            `}</style>

            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="size-4" /> Print / Save as PDF
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
