type FormErrorProps = {
  message: string;
  className?: string;
};

export default function FormError({ message, className = "" }: FormErrorProps) {
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-xs font-bold leading-5 text-red-700 shadow-sm ${className}`}
    >
      {message}
    </div>
  );
}
