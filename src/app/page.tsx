import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="flex flex-col items-center gap-8 p-8">
        <h1 className="text-4xl font-bold text-foreground">
          PlumeNote
        </h1>
        <p className="text-lg text-muted-foreground">
          Collaborative note-taking for IT teams
        </p>

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Design System Test</CardTitle>
            <CardDescription>Testing shadcn/ui components with PlumeNote colors</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input placeholder="Enter your email..." />
            <div className="flex gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="destructive">Destructive</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </CardContent>
        </Card>

        <p className="font-mono text-sm text-muted-foreground">
          Font: JetBrains Mono (monospace)
        </p>
      </main>
    </div>
  );
}
