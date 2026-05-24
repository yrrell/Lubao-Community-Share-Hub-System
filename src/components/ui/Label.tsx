// ============================================================
// src/components/ui/Label.tsx
// FIX: This component was accidentally placed inside
//      src/app/api/users/[id]/route.ts which caused the
//      SWC "Expected '>', got 'className'" compilation error.
//      API route files cannot contain JSX.
// ============================================================

interface LabelProps {
  children:  React.ReactNode;
  required?: boolean;
  htmlFor?:  string;
  className?: string;
}

export default function Label({ children, required, htmlFor, className = "" }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300 ${className}`}
    >
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}
