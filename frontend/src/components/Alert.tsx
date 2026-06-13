type Variant = 'error' | 'success' | 'info'

const styles: Record<Variant, string> = {
  error: 'bg-red-50 border-red-300 text-red-800',
  success: 'bg-green-50 border-green-300 text-green-800',
  info: 'bg-blue-50 border-blue-300 text-blue-800',
}

export default function Alert({
  variant = 'error',
  message,
  className = '',
}: {
  variant?: Variant
  message: string
  className?: string
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles[variant]} ${className}`}>
      {message}
    </div>
  )
}
