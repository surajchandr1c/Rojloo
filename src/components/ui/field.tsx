import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

const fieldBase =
  "w-full rounded-[20px] border border-gray-200 bg-gray-50 px-4 py-3 text-gray-950 outline-none placeholder:text-gray-300 focus:border-gray-500";

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldBase, "rounded-[20px]", className)}
      {...props}
    />
  );
}

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(fieldBase, className)} {...props}>
      {children}
    </select>
  );
});
Select.displayName = "Select";

export function FileInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="file"
      className={cn(
        "block w-full rounded-[20px] border border-gray-200 bg-gray-50 px-4 py-3 text-gray-950 outline-none file:mr-3 file:rounded-[20px] file:border-0 file:bg-gray-600 file:px-4 file:py-2 file:font-semibold file:text-white focus:border-gray-500",
        className
      )}
      {...props}
    />
  );
}
