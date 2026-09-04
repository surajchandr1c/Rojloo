import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "@/lib/cn";

const fieldBase =
  "w-full rounded-[20px] border border-pink-200 bg-pink-50 px-4 py-3 text-red-950 outline-none placeholder:text-red-300 focus:border-red-500";

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

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={cn(fieldBase, className)} {...props}>
      {children}
    </select>
  );
}

export function FileInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="file"
      className={cn(
        "block w-full rounded-[20px] border border-pink-200 bg-pink-50 px-4 py-3 text-red-950 outline-none file:mr-3 file:rounded-[20px] file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white focus:border-red-500",
        className
      )}
      {...props}
    />
  );
}
