/** Static strings for component showcase Code tabs (Preview uses real components on the page). */

export const SHOWCASE_BUTTON_CODE = `import { Button } from "@/components/ui/button";

export function ExampleActions() {
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
`;

export const SHOWCASE_TABLE_CODE = `import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const rows = [
  { artifact: "STATE.xml", role: "Next action + pointers" },
  { artifact: "TASK-REGISTRY.xml", role: "Tasks + verification" },
];

export function ArtifactTable() {
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
            <TableCell className="font-mono text-sm">{r.artifact}</TableCell>
            <TableCell>{r.role}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
`;
