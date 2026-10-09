import { Card, CardHeader, CardContent } from '@/components/ui';

function SectionSkeleton({ cols = 3, title = 'Settings', description = 'Configuration options' }) {
  return (
    <Card>
      <CardHeader title={title} description={description} className="pb-0" />
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
      <SectionSkeleton cols={2} title="General" description="Basic configuration" />
      <SectionSkeleton cols={3} title="Advanced" description="Advanced settings" />
    </div>
  );
}