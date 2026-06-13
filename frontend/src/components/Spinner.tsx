export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cls = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size]
  return (
    <div className="flex justify-center items-center">
      <div className={`${cls} animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600`} />
    </div>
  )
}
