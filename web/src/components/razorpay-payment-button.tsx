import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { ApiError, api } from '@/lib/api'
import type { Booking } from '@/types/api'

// Requires no npm install — Razorpay's checkout.js is loaded from their CDN
// at runtime, matching how the backend already expects the public keyId to
// come back from POST /api/payments/orders rather than being configured
// on the frontend.

interface RazorpaySuccessResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description?: string
  order_id: string
  prefill?: { name?: string; email?: string }
  theme?: { color?: string }
  handler: (response: RazorpaySuccessResponse) => void
  modal?: { ondismiss?: () => void }
}

interface RazorpayInstance { open: () => void }

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

let scriptPromise: Promise<void> | null = null
function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve()
      script.onerror = () => {
        scriptPromise = null
        reject(new Error('Could not load the payment provider. Check your connection and try again.'))
      }
      document.body.appendChild(script)
    })
  }
  return scriptPromise
}

interface RazorpayPaymentButtonProps {
  booking: Booking
  onPaid: () => void
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function RazorpayPaymentButton({ booking, onPaid, size = 'sm', className }: RazorpayPaymentButtonProps) {
  const { user, accessToken } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)

  async function startPayment() {
    if (!accessToken) return
    setIsProcessing(true)
    try {
      await loadRazorpayScript()
      const orderResponse = await api.createPaymentOrder(booking._id, accessToken)
      const { order, keyId } = orderResponse.data

      if (!window.Razorpay) throw new Error('Payment could not start. Please try again.')

      const checkout = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'CaseJeeto',
        description: 'Legal consultation fee',
        order_id: order.id,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#1d2b53' },
        handler: (response) => {
          void (async () => {
            try {
              await api.verifyPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }, accessToken)
              toast.success('Payment confirmed. Your consultation is booked.')
              onPaid()
            } catch (error) {
              toast.error(error instanceof ApiError ? error.message : 'Payment could not be verified. If money was deducted, contact support with your booking ID.')
            } finally {
              setIsProcessing(false)
            }
          })()
        },
        modal: { ondismiss: () => setIsProcessing(false) },
      })
      checkout.open()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Payment could not start.')
      setIsProcessing(false)
    }
  }

  return (
    <Button size={size} className={className} onClick={() => void startPayment()} disabled={isProcessing}>
      {isProcessing ? 'Opening payment…' : 'Pay now'}
    </Button>
  )
}
