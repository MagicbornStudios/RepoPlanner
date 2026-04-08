import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export function ShowcaseButtonRow() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button">Primary</Button>
      <Button type="button" variant="outline">
        Outline
      </Button>
      <Button type="button" variant="ghost" size="sm">
        Ghost sm
      </Button>
    </div>
  );
}

const rows = [
  { artifact: "STATE.xml", role: "Next action + pointers" },
  { artifact: "TASK-REGISTRY.xml", role: "Tasks + verification" },
] as const;

export function ShowcaseArtifactTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Artifact</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.artifact}>
            <TableCell className="font-mono text-sm text-[var(--primary)]">{r.artifact}</TableCell>
            <TableCell className="text-[var(--muted-foreground)]">{r.role}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
