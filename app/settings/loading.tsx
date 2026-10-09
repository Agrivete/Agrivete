import { Card, CardHeader, CardContent } from '@/components/ui';

function SectionSkeleton({ cols = 3 }) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="h-5 w-48 bg-slate-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {[...Array(cols * 2)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsLoading() {
  return (
    <div className="space-y-6 p-6">
      <SectionSkeleton cols={2} />
      <SectionSkeleton cols={3} />
    </div>
  );
}