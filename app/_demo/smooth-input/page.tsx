import { SmoothInput, Input } from '@/components/v1/skiper106';

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-md space-y-4 p-8 text-2xl">
      <SmoothInput placeholder="smooth input" aria-label="Smooth caret input" />
      <Input placeholder="normal input" className="caret-primary" aria-label="Normal input" />
    </div>
  );
}