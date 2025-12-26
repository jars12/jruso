import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  LayoutGrid,
  FolderKanban,
  ClipboardCheck,
  Rocket,
  ShieldAlert,
  GitPullRequest,
  LineChart,
  Settings,
  Search,
  Bell,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
} from "lucide-react";

/**
 * Lambda Project OS — Frontend-only MVP
 * - Visualizable in ChatGPT canvas
 * - In-memory data (no backend)
 * - Enforces key Lambda rules:
 *   1) No sprint creation unless Discovery approved
 *   2) No QA Gate approval if critical defects open
 *   3) Change requests cannot enter active sprint; they go to backlog
 */

const ROLES = [
  { id: "ADMIN", name: "Admin" },
  { id: "PM", name: "Project Manager" },
  { id: "PL", name: "Líder de Proyecto" },
  { id: "TECH", name: "Tech Lead" },
  { id: "QA", name: "QA" },
  { id: "DEV", name: "Developer" },
  { id: "CLIENT", name: "Cliente" },
];

const HEALTH = {
  GREEN: { label: "Saludable", color: "bg-emerald-600" },
  YELLOW: { label: "En riesgo", color: "bg-amber-600" },
  RED: { label: "Crítico", color: "bg-rose-600" },
};

const initialData = {
  companies: [
    { id: "c1", name: "Empresa A" },
    { id: "c2", name: "Empresa B" },
  ],
  users: [
    { id: "u1", name: "Javier Ruiz", role: "PM" },
    { id: "u2", name: "Camila", role: "PL" },
    { id: "u3", name: "Mateo", role: "TECH" },
    { id: "u4", name: "Laura", role: "QA" },
    { id: "u5", name: "Dev Junior 1", role: "DEV" },
    { id: "u6", name: "Cliente ACME", role: "CLIENT" },
  ],
  capacityRules: {
    PM: { maxCompanies: 2 },
    PL: { maxProjects: 8 },
  },
  projects: [
    {
      id: "p1",
      companyId: "c1",
      name: "Omnicanal IA – ACME",
      client: "ACME",
      type: "IA",
      pmId: "u1",
      plId: "u2",
      techLeadId: "u3",
      qaId: "u4",
      status: "PENDING_DISCOVERY", // PENDING_DISCOVERY | ACTIVE | AT_RISK | CLOSED
      health: { time: "YELLOW", quality: "YELLOW", rework: "YELLOW", roi: "YELLOW" },
      nextDemo: "Viernes",
      discovery: {
        state: "DRAFT", // DRAFT | IN_APPROVAL | APPROVED | REJECTED
        problem: "",
        objective: "",
        scopeIn: "",
        scopeOut: "",
        roiBaseline: "",
        roiTarget: "30",
        quickWins: "",
        approvals: { pm: false, client: false },
      },
      backlog: [
        {
          id: "US-101",
          title: "Como cliente quiero ver el resumen del proyecto para entender el valor semanal",
          value: "High",
          priority: 1,
          acceptanceCriteria: [
            "Se muestra objetivo, estado, próxima demo y KPIs clave",
            "Accesible según rol",
          ],
          status: "READY", // DRAFT | READY | IN_SPRINT | DONE
        },
        {
          id: "US-102",
          title: "Como QA quiero aprobar/rechazar el QA Gate antes de demo",
          value: "High",
          priority: 2,
          acceptanceCriteria: ["No se puede aprobar con defectos críticos abiertos"],
          status: "READY",
        },
        {
          id: "US-103",
          title: "Como PM quiero ver capacidad vs asignación",
          value: "Medium",
          priority: 3,
          acceptanceCriteria: ["Bloquea asignación si supera límites"],
          status: "DRAFT",
        },
      ],
      sprints: [],
      changeRequests: [
        {
          id: "CR-1",
          title: "Agregar reporte adicional",
          description: "Cliente solicita un reporte nuevo para gerencia.",
          impactTimeWeeks: 1,
          impactROI: "Medio",
          impactQuality: "Bajo",
          status: "PENDING", // PENDING | APPROVED | REJECTED | DEFERRED
          decisionNote: "",
        },
      ],
      kpis: {
        weeklyDelivery: 0.85,
        leadTimeDays: 9,
        reworkRate: 0.18,
        demoErrors: 1,
        roiEstimated: 0.32,
      },
    },
  ],
  qaChecklistTemplate: [
    { id: "q1", label: "Criterios de aceptación verificados" },
    { id: "q2", label: "Pruebas funcionales ejecutadas" },
    { id: "q3", label: "Sin defectos críticos" },
    { id: "q4", label: "UX mínimo aceptable" },
  ],
};

function roleName(roleId) {
  return ROLES.find((r) => r.id === roleId)?.name ?? roleId;
}

function statusLabel(status) {
  switch (status) {
    case "PENDING_DISCOVERY":
      return "Pendiente Discovery";
    case "ACTIVE":
      return "En ejecución";
    case "AT_RISK":
      return "En riesgo";
    case "CLOSED":
      return "Cerrado";
    default:
      return status;
  }
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function HealthDot({ level }) {
  const health = HEALTH[level] || HEALTH.YELLOW;
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${health.color}`} aria-hidden="true" />
      <span className="text-xs text-muted-foreground">{health.label}</span>
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

function TopBar({ query, setQuery, onClear }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-9 items-center gap-2 rounded-xl border bg-background px-3 shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Buscar"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar: proyecto, historia, sprint, defecto, cambio…"
            className="h-7 w-[320px] border-0 bg-transparent p-0 focus-visible:ring-0"
          />
          {query ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              aria-label="Limpiar búsqueda"
              onClick={onClear}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
        <span className="hidden text-xs text-muted-foreground md:inline">Tip: usa palabras clave de historias o sprints.</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="rounded-xl">
          <Bell className="mr-2 h-4 w-4" aria-hidden="true" /> Notificaciones
        </Button>
        <Button variant="outline" className="rounded-xl">
          <Settings className="mr-2 h-4 w-4" aria-hidden="true" /> Ajustes
        </Button>
      </div>
    </div>
  );
}

function Sidebar({ active, setActive }) {
  const items = [
    { id: "PORTFOLIO", label: "Portafolio", icon: LayoutGrid },
    { id: "PROJECT", label: "Proyecto", icon: FolderKanban },
    { id: "BACKLOG", label: "Backlog", icon: GitPullRequest },
    { id: "SPRINTS", label: "Sprints", icon: Rocket },
    { id: "QA", label: "QA", icon: ClipboardCheck },
    { id: "CHANGES", label: "Cambios", icon: ShieldAlert },
    { id: "REPORTS", label: "Reportes", icon: LineChart },
  ];
  return (
    <div className="flex h-full w-64 flex-col gap-2 border-r bg-background p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Lambda Project OS</span>
          <span className="text-xs text-muted-foreground">MVP • Gobierno + Delivery</span>
        </div>
        <Badge className="rounded-xl" variant="secondary">
          v0.1
        </Badge>
      </div>
      <Separator className="my-2" />
      <div className="flex flex-col gap-1" role="navigation" aria-label="Secciones">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                isActive ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="mt-auto rounded-xl border bg-muted/30 p-3">
        <div className="text-xs font-medium">Reglas Lambda (MVP)</div>
        <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
          <li>Sin Discovery aprobado no hay Sprint.</li>
          <li>Sin QA Gate aprobado no hay Demo.</li>
          <li>Cambios nunca entran a sprint activo.</li>
        </ul>
      </div>
    </div>
  );
}

function KPIBar({ label, value, goodAt = 0.9, format = "pct" }) {
  const pct = Math.max(0, Math.min(1, value));
  const tone =
    pct >= goodAt ? "text-emerald-700" : pct >= goodAt - 0.15 ? "text-amber-700" : "text-rose-700";
  const show = format === "pct" ? formatPercent(pct) : `${value}`;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${tone}`}>{show}</span>
      </div>
      <Progress value={pct * 100} className="h-2" aria-label={`${label}: ${show}`} />
    </div>
  );
}

function PortfolioView({ data, currentProjectId, setCurrentProjectId, query }) {
  const projects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.projects;
    return data.projects.filter((project) =>
      [project.name, project.client, project.type].some((value) =>
        (value || "").toLowerCase().includes(q)
      )
    );
  }, [data.projects, query]);

  const selected = data.projects.find((project) => project.id === currentProjectId) || data.projects[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Alert className="rounded-2xl" role="status">
              <AlertTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Proyectos sin Discovery
              </AlertTitle>
              <AlertDescription className="text-xs">
                {data.projects.filter((project) => project.discovery.state !== "APPROVED").length} proyecto(s) requieren
                aprobación para iniciar desarrollo.
              </AlertDescription>
            </Alert>
            <Alert className="rounded-2xl" role="status">
              <AlertTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Demos en riesgo
              </AlertTitle>
              <AlertDescription className="text-xs">1 proyecto con errores en demo &gt; 0 (meta = 0).</AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="rounded-2xl md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Salud del portafolio (Top KPIs)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <KPIBar label="Cumplimiento semanal" value={selected.kpis.weeklyDelivery} goodAt={0.9} />
            <KPIBar label="Rework rate" value={1 - selected.kpis.reworkRate} goodAt={0.85} />
            <KPIBar label="ROI estimado" value={selected.kpis.roiEstimated} goodAt={0.3} />
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Errores demo</span>
                <span
                  className={
                    selected.kpis.demoErrors === 0 ? "font-medium text-emerald-700" : "font-medium text-rose-700"
                  }
                >
                  {selected.kpis.demoErrors}
                </span>
              </div>
              <Progress value={selected.kpis.demoErrors === 0 ? 100 : 30} className="h-2" aria-label="Errores demo" />
              <p className="text-[11px] text-muted-foreground">Meta: 0</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.id} className="rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Pill>Cliente: {project.client}</Pill>
                    <Pill>Tipo: {project.type}</Pill>
                    <Badge variant="outline" className="rounded-xl">
                      {statusLabel(project.status)}
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={() => setCurrentProjectId(project.id)}
                  className="rounded-xl"
                  variant={project.id === currentProjectId ? "default" : "outline"}
                >
                  Abrir
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Tiempo</div>
                    <HealthDot level={project.health.time} />
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Calidad</div>
                    <HealthDot level={project.health.quality} />
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Rework</div>
                    <HealthDot level={project.health.rework} />
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">ROI</div>
                    <HealthDot level={project.health.roi} />
                  </div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Discovery</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className="rounded-xl" variant={project.discovery.state === "APPROVED" ? "default" : "secondary"}>
                      {project.discovery.state}
                    </Badge>
                    <span className="text-xs text-muted-foreground">(bloquea sprints si no está aprobado)</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <KPIBar label="Cumplimiento semanal" value={project.kpis.weeklyDelivery} goodAt={0.9} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Lead time</div>
                    <div className="mt-1 text-sm font-medium">{project.kpis.leadTimeDays} días</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Próxima demo</div>
                    <div className="mt-1 text-sm font-medium">{project.nextDemo}</div>
                  </div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Errores en demo</div>
                  <div className="mt-1 flex items-center gap-2">
                    {project.kpis.demoErrors === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-700" aria-hidden="true" />
                    )}
                    <div className="text-sm font-medium">{project.kpis.demoErrors}</div>
                    <span className="text-xs text-muted-foreground">(meta 0)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ProjectOverview({ data, project, setData, role }) {
  const pm = data.users.find((user) => user.id === project.pmId);
  const pl = data.users.find((user) => user.id === project.plId);
  const tech = data.users.find((user) => user.id === project.techLeadId);
  const qa = data.users.find((user) => user.id === project.qaId);

  const canEditGov = ["ADMIN", "PM"].includes(role);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="rounded-2xl md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{project.name}</CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Pill>Cliente: {project.client}</Pill>
            <Pill>Tipo: {project.type}</Pill>
            <Badge variant="outline" className="rounded-xl">
              {statusLabel(project.status)}
            </Badge>
            <Badge className="rounded-xl" variant={project.discovery.state === "APPROVED" ? "default" : "secondary"}>
              Discovery: {project.discovery.state}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-muted-foreground">PM</div>
              <div className="mt-1 text-sm font-medium">{pm?.name}</div>
            </div>
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-muted-foreground">Líder</div>
              <div className="mt-1 text-sm font-medium">{pl?.name}</div>
            </div>
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-muted-foreground">Tech Lead</div>
              <div className="mt-1 text-sm font-medium">{tech?.name}</div>
            </div>
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-muted-foreground">QA</div>
              <div className="mt-1 text-sm font-medium">{qa?.name}</div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">KPIs del proyecto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <KPIBar label="Cumplimiento semanal" value={project.kpis.weeklyDelivery} goodAt={0.9} />
                <KPIBar label="ROI estimado" value={project.kpis.roiEstimated} goodAt={0.3} />
                <KPIBar label="Rework (mejor es alto)" value={1 - project.kpis.reworkRate} goodAt={0.85} />
                <div className="rounded-xl border p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Errores en demo</span>
                    <span
                      className={
                        project.kpis.demoErrors === 0 ? "font-medium text-emerald-700" : "font-medium text-rose-700"
                      }
                    >
                      {project.kpis.demoErrors}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Meta: 0</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Acciones rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full rounded-xl"
                  variant={project.discovery.state === "APPROVED" ? "secondary" : "default"}
                  onClick={() => {
                    // just jump hint; navigation handled outside
                  }}
                >
                  Completar / Revisar Discovery
                </Button>
                <Button
                  className="w-full rounded-xl"
                  variant="outline"
                  disabled={project.discovery.state !== "APPROVED"}
                  onClick={() => {
                    // sprint creation happens in Sprints module
                  }}
                  title={project.discovery.state !== "APPROVED" ? "Bloqueado: Discovery no aprobado" : ""}
                >
                  Crear Sprint (si Discovery aprobado)
                </Button>
                <Button className="w-full rounded-xl" variant="outline">
                  Ir a QA Gate
                </Button>
                {canEditGov && (
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Actualizar estado</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="rounded-xl"
                        variant="outline"
                        onClick={() => {
                          setData((prev) => {
                            const projects = prev.projects.map((item) =>
                              item.id === project.id ? { ...item, status: "ACTIVE" } : item
                            );
                            return { ...prev, projects };
                          });
                        }}
                      >
                        En ejecución
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl"
                        variant="outline"
                        onClick={() => {
                          setData((prev) => {
                            const projects = prev.projects.map((item) =>
                              item.id === project.id ? { ...item, status: "AT_RISK" } : item
                            );
                            return { ...prev, projects };
                          });
                        }}
                      >
                        En riesgo
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl"
                        variant="outline"
                        onClick={() => {
                          setData((prev) => {
                            const projects = prev.projects.map((item) =>
                              item.id === project.id ? { ...item, status: "CLOSED" } : item
                            );
                            return { ...prev, projects };
                          });
                        }}
                      >
                        Cerrar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Salud (semáforos)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Tiempo</div>
            <div className="mt-1">
              <HealthDot level={project.health.time} />
            </div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Calidad</div>
            <div className="mt-1">
              <HealthDot level={project.health.quality} />
            </div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Rework</div>
            <div className="mt-1">
              <HealthDot level={project.health.rework} />
            </div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">ROI</div>
            <div className="mt-1">
              <HealthDot level={project.health.roi} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DiscoveryView({ project, setData, role }) {
  const discovery = project.discovery;
  const canEdit = ["ADMIN", "PM", "PL"].includes(role);
  const canApprovePM = ["ADMIN", "PM"].includes(role);
  const canApproveClient = ["CLIENT"].includes(role);

  const missing = useMemo(() => {
    const required = [
      ["problem", "Problema"],
      ["objective", "Objetivo"],
      ["scopeIn", "Incluye"],
      ["scopeOut", "No incluye"],
      ["roiBaseline", "Baseline ROI"],
    ];
    return required.filter(([key]) => !(discovery[key] || "").trim()).map(([, label]) => label);
  }, [discovery]);

  const approved = discovery.state === "APPROVED";

  const setDiscovery = (patch) => {
    setData((prev) => {
      const projects = prev.projects.map((item) =>
        item.id === project.id ? { ...item, discovery: { ...item.discovery, ...patch } } : item
      );
      return { ...prev, projects };
    });
  };

  const setProjectStatusIfApproved = () => {
    setData((prev) => {
      const projects = prev.projects.map((item) => {
        if (item.id !== project.id) return item;
        const nextStatus = item.status === "PENDING_DISCOVERY" ? "ACTIVE" : item.status;
        return { ...item, status: nextStatus };
      });
      return { ...prev, projects };
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="rounded-2xl md:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Discovery (Sprint 0)</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className="rounded-xl" variant={approved ? "default" : "secondary"}>
                  Estado: {discovery.state}
                </Badge>
                {approved ? (
                  <Badge className="rounded-xl" variant="outline">
                    ✅ Habilita creación de Sprint
                  </Badge>
                ) : (
                  <Badge className="rounded-xl" variant="outline">
                    ⛔ Bloquea creación de Sprint
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="rounded-xl"
                variant="outline"
                disabled={!canEdit}
                onClick={() => setDiscovery({ state: "DRAFT" })}
              >
                Marcar como borrador
              </Button>
              <Button
                className="rounded-xl"
                disabled={!canEdit || missing.length > 0}
                onClick={() => setDiscovery({ state: "IN_APPROVAL" })}
                title={missing.length ? `Faltan: ${missing.join(", ")}` : ""}
              >
                Enviar a aprobación
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {missing.length > 0 && (
            <Alert className="rounded-2xl" role="status">
              <AlertTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Campos obligatorios faltantes
              </AlertTitle>
              <AlertDescription className="text-xs">
                Completa: <b>{missing.join(", ")}</b>.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="discovery-problem" className="text-xs font-medium">
                Problema de negocio
              </label>
              <Textarea
                id="discovery-problem"
                value={discovery.problem}
                onChange={(event) => setDiscovery({ problem: event.target.value })}
                disabled={!canEdit}
                className="min-h-[110px] rounded-2xl"
                placeholder="Describe la situación actual y el dolor principal…"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="discovery-objective" className="text-xs font-medium">
                Objetivo del proyecto (1 frase)
              </label>
              <Textarea
                id="discovery-objective"
                value={discovery.objective}
                onChange={(event) => setDiscovery({ objective: event.target.value })}
                disabled={!canEdit}
                className="min-h-[110px] rounded-2xl"
                placeholder="Ej: Reducir el tiempo de atención en 40% mediante automatización con IA."
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="discovery-scope-in" className="text-xs font-medium">
                Alcance — Incluye
              </label>
              <Textarea
                id="discovery-scope-in"
                value={discovery.scopeIn}
                onChange={(event) => setDiscovery({ scopeIn: event.target.value })}
                disabled={!canEdit}
                className="min-h-[110px] rounded-2xl"
                placeholder="Qué sí incluye el proyecto (bullet list)…"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="discovery-scope-out" className="text-xs font-medium">
                Alcance — No incluye
              </label>
              <Textarea
                id="discovery-scope-out"
                value={discovery.scopeOut}
                onChange={(event) => setDiscovery({ scopeOut: event.target.value })}
                disabled={!canEdit}
                className="min-h-[110px] rounded-2xl"
                placeholder="Qué no incluye (evita reprocesos)…"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border p-3">
              <label htmlFor="discovery-roi-baseline" className="text-xs text-muted-foreground">
                ROI baseline (actual)
              </label>
              <Input
                id="discovery-roi-baseline"
                value={discovery.roiBaseline}
                onChange={(event) => setDiscovery({ roiBaseline: event.target.value })}
                disabled={!canEdit}
                className="mt-2 rounded-xl"
                placeholder="Ej: 120 horas/mes"
              />
            </div>
            <div className="rounded-2xl border p-3">
              <label htmlFor="discovery-roi-target" className="text-xs text-muted-foreground">
                Meta ROI (%)
              </label>
              <Input
                id="discovery-roi-target"
                value={discovery.roiTarget}
                onChange={(event) => setDiscovery({ roiTarget: event.target.value })}
                disabled={!canEdit}
                className="mt-2 rounded-xl"
                placeholder="30"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">Promesa: ROI ≥ 30%</p>
            </div>
            <div className="rounded-2xl border p-3">
              <label htmlFor="discovery-quick-wins" className="text-xs text-muted-foreground">
                Quick wins (semanas 1–3)
              </label>
              <Input
                id="discovery-quick-wins"
                value={discovery.quickWins}
                onChange={(event) => setDiscovery({ quickWins: event.target.value })}
                disabled={!canEdit}
                className="mt-2 rounded-xl"
                placeholder="Ej: Bot WhatsApp + reporte semanal"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">Aprobaciones</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Aprobación PM</div>
                    <div className="mt-1 text-sm font-medium">{discovery.approvals.pm ? "Aprobado" : "Pendiente"}</div>
                  </div>
                  <Button
                    className="rounded-xl"
                    size="sm"
                    variant={discovery.approvals.pm ? "secondary" : "default"}
                    disabled={!canApprovePM || discovery.state !== "IN_APPROVAL"}
                    onClick={() => setDiscovery({ approvals: { ...discovery.approvals, pm: true } })}
                    title={discovery.state !== "IN_APPROVAL" ? "Primero envía a aprobación" : ""}
                  >
                    Aprobar
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Aprobación Cliente</div>
                    <div className="mt-1 text-sm font-medium">{discovery.approvals.client ? "Aprobado" : "Pendiente"}</div>
                  </div>
                  <Button
                    className="rounded-xl"
                    size="sm"
                    variant={discovery.approvals.client ? "secondary" : "default"}
                    disabled={!canApproveClient || discovery.state !== "IN_APPROVAL"}
                    onClick={() => setDiscovery({ approvals: { ...discovery.approvals, client: true } })}
                    title={discovery.state !== "IN_APPROVAL" ? "Primero envía a aprobación" : ""}
                  >
                    Aprobar
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3">
              <div>
                <div className="text-xs text-muted-foreground">Estado final</div>
                <div className="mt-1 text-sm font-medium">
                  {discovery.approvals.pm && discovery.approvals.client ? "Listo para aprobar" : "Faltan aprobaciones"}
                </div>
              </div>
              <Button
                className="rounded-xl"
                disabled={!(discovery.approvals.pm && discovery.approvals.client)}
                onClick={() => {
                  setDiscovery({ state: "APPROVED" });
                  setProjectStatusIfApproved();
                }}
              >
                Marcar Discovery como APROBADO
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Reglas aplicadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Regla</div>
            <div className="mt-1 font-medium">Sin Discovery aprobado no hay Sprint</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Estado actual: <b>{discovery.state}</b>
            </div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Checklist</div>
            <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
              <li>Problema, objetivo, alcance</li>
              <li>ROI baseline + meta</li>
              <li>Quick wins</li>
              <li>Aprobación PM + Cliente</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BacklogView({ project, setData, role, query }) {
  const canEdit = ["ADMIN", "PM", "PL"].includes(role);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...project.backlog].sort((a, b) => a.priority - b.priority);
    if (!q) return list;
    return list.filter((story) =>
      [story.id, story.title].some((value) => (value || "").toLowerCase().includes(q))
    );
  }, [project.backlog, query]);

  const counts = useMemo(() => {
    const ready = project.backlog.filter((item) => item.status === "READY").length;
    const missingAC = project.backlog.filter(
      (item) => (item.acceptanceCriteria || []).filter((line) => (line || "").trim()).length === 0
    ).length;
    return { ready, missingAC };
  }, [project.backlog]);

  const setProject = (patch) => {
    setData((prev) => {
      const projects = prev.projects.map((item) => (item.id === project.id ? { ...item, ...patch } : item));
      return { ...prev, projects };
    });
  };

  const [newStory, setNewStory] = useState({
    id: "",
    title: "",
    value: "Medium",
    priority: 10,
    acceptanceCriteria: [""],
  });

  const addStory = () => {
    if (!newStory.id.trim() || !newStory.title.trim()) return;
    const cleanedAC = newStory.acceptanceCriteria.map((line) => line.trim()).filter(Boolean);
    const story = {
      id: newStory.id.trim(),
      title: newStory.title.trim(),
      value: newStory.value,
      priority: Number(newStory.priority) || 10,
      acceptanceCriteria: cleanedAC,
      status: cleanedAC.length ? "READY" : "DRAFT",
    };
    setProject({ backlog: [story, ...project.backlog] });
    setNewStory({ id: "", title: "", value: "Medium", priority: 10, acceptanceCriteria: [""] });
  };

  const toggleReady = (id) => {
    setData((prev) => {
      const projects = prev.projects.map((item) => {
        if (item.id !== project.id) return item;
        return {
          ...item,
          backlog: item.backlog.map((story) => {
            if (story.id !== id) return story;
            const hasAC = (story.acceptanceCriteria || []).filter((line) => (line || "").trim()).length > 0;
            const next = story.status === "READY" ? "DRAFT" : hasAC ? "READY" : "DRAFT";
            return { ...story, status: next };
          }),
        };
      });
      return { ...prev, projects };
    });
  };

  const updateStoryAC = (id, idx, value) => {
    setData((prev) => {
      const projects = prev.projects.map((item) => {
        if (item.id !== project.id) return item;
        return {
          ...item,
          backlog: item.backlog.map((story) => {
            if (story.id !== id) return story;
            const ac = [...(story.acceptanceCriteria || [])];
            ac[idx] = value;
            const hasAC = ac.filter((line) => (line || "").trim()).length > 0;
            const status = story.status === "READY" && !hasAC ? "DRAFT" : story.status;
            return { ...story, acceptanceCriteria: ac, status };
          }),
        };
      });
      return { ...prev, projects };
    });
  };

  const addACLine = (id) => {
    setData((prev) => {
      const projects = prev.projects.map((item) => {
        if (item.id !== project.id) return item;
        return {
          ...item,
          backlog: item.backlog.map((story) =>
            story.id === id ? { ...story, acceptanceCriteria: [...(story.acceptanceCriteria || []), ""] } : story
          ),
        };
      });
      return { ...prev, projects };
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="rounded-2xl md:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Backlog</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Regla: una historia <b>sin criterios de aceptación</b> no puede entrar a Sprint.
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="rounded-xl" disabled={!canEdit}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Nueva historia
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Nueva historia</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="story-id" className="text-xs font-medium">
                        ID
                      </label>
                      <Input
                        id="story-id"
                        className="mt-1 rounded-xl"
                        placeholder="US-201"
                        value={newStory.id}
                        onChange={(event) => setNewStory((state) => ({ ...state, id: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="story-value" className="text-xs font-medium">
                        Valor
                      </label>
                      <Select value={newStory.value} onValueChange={(value) => setNewStory((state) => ({ ...state, value }))}>
                        <SelectTrigger id="story-value" className="mt-1 rounded-xl">
                          <SelectValue placeholder="Valor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="story-title" className="text-xs font-medium">
                      Título
                    </label>
                    <Textarea
                      id="story-title"
                      className="mt-1 min-h-[90px] rounded-2xl"
                      placeholder="Como [rol] quiero [necesidad] para [beneficio]"
                      value={newStory.title}
                      onChange={(event) => setNewStory((state) => ({ ...state, title: event.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="story-priority" className="text-xs font-medium">
                        Prioridad
                      </label>
                      <Input
                        id="story-priority"
                        className="mt-1 rounded-xl"
                        type="number"
                        value={newStory.priority}
                        onChange={(event) => setNewStory((state) => ({ ...state, priority: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium">Criterios de aceptación</div>
                    <div className="mt-2 space-y-2">
                      {newStory.acceptanceCriteria.map((line, idx) => (
                        <Input
                          key={`new-ac-${idx}`}
                          className="rounded-xl"
                          placeholder={`AC ${idx + 1}`}
                          value={line}
                          onChange={(event) => {
                            const ac = [...newStory.acceptanceCriteria];
                            ac[idx] = event.target.value;
                            setNewStory((state) => ({ ...state, acceptanceCriteria: ac }));
                          }}
                        />
                      ))}
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() =>
                          setNewStory((state) => ({ ...state, acceptanceCriteria: [...state.acceptanceCriteria, ""] }))
                        }
                      >
                        + Agregar AC
                      </Button>
                    </div>
                  </div>
                  <Button className="rounded-xl" onClick={addStory}>
                    Crear historia
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((story) => {
            const hasAC = (story.acceptanceCriteria || []).filter((line) => (line || "").trim()).length > 0;
            const ready = story.status === "READY";
            return (
              <div key={story.id} className="rounded-2xl border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold">{story.id}</div>
                      <Badge className="rounded-xl" variant={ready ? "default" : "secondary"}>
                        {ready ? "READY" : "DRAFT"}
                      </Badge>
                      <Badge className="rounded-xl" variant="outline">
                        Valor: {story.value}
                      </Badge>
                      <Pill>Prioridad: {story.priority}</Pill>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{story.title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="rounded-xl"
                      variant={ready ? "secondary" : "outline"}
                      disabled={!canEdit || !hasAC}
                      onClick={() => toggleReady(story.id)}
                      title={!hasAC ? "No puedes marcar READY sin AC" : ""}
                    >
                      {ready ? "Marcar DRAFT" : "Marcar READY"}
                    </Button>
                  </div>
                </div>

                <Separator className="my-3" />
                <div className="text-xs font-medium">Criterios de aceptación</div>
                <div className="mt-2 space-y-2">
                  {(story.acceptanceCriteria || []).map((ac, idx) => (
                    <Input
                      key={`ac-${story.id}-${idx}`}
                      className="rounded-xl"
                      value={ac}
                      disabled={!canEdit}
                      placeholder={`AC ${idx + 1}`}
                      onChange={(event) => updateStoryAC(story.id, idx, event.target.value)}
                    />
                  ))}
                  {canEdit && (
                    <Button variant="outline" className="rounded-xl" onClick={() => addACLine(story.id)}>
                      + Agregar AC
                    </Button>
                  )}
                </div>

                {!hasAC && (
                  <p className="mt-2 text-xs text-rose-700">
                    ⛔ Esta historia no puede entrar a Sprint: faltan criterios de aceptación.
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Historias READY</div>
            <div className="mt-1 text-2xl font-semibold">{counts.ready}</div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Historias sin AC</div>
            <div className="mt-1 text-2xl font-semibold">{counts.missingAC}</div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Regla</div>
            <div className="mt-1 text-sm font-medium">Sin AC → no entra a Sprint</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SprintsView({ project, setData, role }) {
  const canCreate = ["ADMIN", "PL", "PM"].includes(role);
  const discoveryApproved = project.discovery.state === "APPROVED";

  const activeSprint = project.sprints.find((sprint) => sprint.state === "ACTIVE");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [selectedStories, setSelectedStories] = useState([]);

  const readyStories = project.backlog.filter((story) => story.status === "READY");

  const createSprint = () => {
    if (!goal.trim()) return;
    const ids = selectedStories;
    const items = project.backlog
      .filter((story) => ids.includes(story.id))
      .map((story) => ({ storyId: story.id, col: "TODO" }));

    setData((prev) => {
      const projects = prev.projects.map((item) => {
        if (item.id !== project.id) return item;
        const sprintNo = (item.sprints?.length || 0) + 1;
        const newSprint = {
          id: `SP-${sprintNo}`,
          name: `Sprint ${sprintNo}`,
          week: "Semana actual",
          goal: goal.trim(),
          state: "ACTIVE", // ACTIVE | DONE
          qaGate: { state: "PENDING", note: "" },
          checklist: prev.qaChecklistTemplate.map((check) => ({ ...check, checked: false })),
          defects: [
            // example defect to show gating
            { id: `DF-${sprintNo}-1`, title: "Error en validación", severity: "CRITICAL", status: "OPEN" },
          ],
          board: items,
          retro: { wentWell: "", improve: "", action: "" },
          demo: { accepted: false, note: "" },
        };

        // mark stories as IN_SPRINT
        const backlog = item.backlog.map((story) =>
          ids.includes(story.id) ? { ...story, status: "IN_SPRINT" } : story
        );

        return { ...item, backlog, sprints: [newSprint, ...(item.sprints || [])] };
      });
      return { ...prev, projects };
    });

    setDialogOpen(false);
    setGoal("");
    setSelectedStories([]);
  };

  const moveCard = (storyId, col) => {
    setData((prev) => {
      const projects = prev.projects.map((item) => {
        if (item.id !== project.id) return item;
        const sprints = item.sprints.map((sprint) => {
          if (sprint.state !== "ACTIVE") return sprint;
          return {
            ...sprint,
            board: sprint.board.map((card) => (card.storyId === storyId ? { ...card, col } : card)),
          };
        });
        return { ...item, sprints };
      });
      return { ...prev, projects };
    });
  };

  const completeSprint = () => {
    if (!activeSprint) return;
    setData((prev) => {
      const projects = prev.projects.map((item) => {
        if (item.id !== project.id) return item;
        const sprints = item.sprints.map((sprint) =>
          sprint.id === activeSprint.id ? { ...sprint, state: "DONE" } : sprint
        );
        const doneStoryIds = activeSprint.board
          .filter((card) => card.col === "DONE")
          .map((card) => card.storyId);
        const backlog = item.backlog.map((story) =>
          doneStoryIds.includes(story.id) ? { ...story, status: "DONE" } : story
        );
        return { ...item, sprints, backlog };
      });
      return { ...prev, projects };
    });
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Sprints (semanales)</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Regla: solo se puede crear sprint si <b>Discovery está APROBADO</b>.
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="rounded-xl"
                  disabled={!canCreate || !discoveryApproved || !!activeSprint}
                  title={!discoveryApproved ? "Bloqueado: Discovery no aprobado" : activeSprint ? "Ya existe un sprint activo" : ""}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Crear Sprint
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Crear Sprint (1 semana)</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {!discoveryApproved && (
                    <Alert className="rounded-2xl" role="status">
                      <AlertTitle>Bloqueado</AlertTitle>
                      <AlertDescription className="text-xs">Debes aprobar Discovery antes de crear un sprint.</AlertDescription>
                    </Alert>
                  )}
                  <div>
                    <label htmlFor="sprint-goal" className="text-xs font-medium">
                      Objetivo del sprint
                    </label>
                    <Input
                      id="sprint-goal"
                      className="mt-1 rounded-xl"
                      value={goal}
                      onChange={(event) => setGoal(event.target.value)}
                      placeholder="Ej: Entregar QA Gate + tablero de sprint"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium">Historias READY</div>
                    <div className="mt-2 space-y-2">
                      {readyStories.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No hay historias READY.</p>
                      ) : (
                        readyStories.map((story) => (
                          <label key={story.id} className="flex items-center gap-2 rounded-xl border p-2">
                            <Checkbox
                              checked={selectedStories.includes(story.id)}
                              onCheckedChange={(value) => {
                                setSelectedStories((prev) =>
                                  value ? [...prev, story.id] : prev.filter((item) => item !== story.id)
                                );
                              }}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{story.id}</span>
                              <span className="text-xs text-muted-foreground">{story.title}</span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <Button className="rounded-xl" onClick={createSprint} disabled={!discoveryApproved || !goal.trim()}>
                    Crear
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Discovery</div>
            <div className="mt-1 text-sm font-medium">{project.discovery.state}</div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Sprint activo</div>
            <div className="mt-1 text-sm font-medium">{activeSprint ? activeSprint.name : "—"}</div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">QA Gate</div>
            <div className="mt-1 text-sm font-medium">{activeSprint ? activeSprint.qaGate.state : "—"}</div>
          </div>
        </CardContent>
      </Card>

      {activeSprint ? (
        <SprintBoard
          project={project}
          sprint={activeSprint}
          moveCard={moveCard}
          completeSprint={completeSprint}
          setData={setData}
          role={role}
        />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border bg-muted/40">
              <Rocket className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="mt-3 text-sm font-medium">No hay sprint activo</div>
            <div className="mt-1 text-xs text-muted-foreground">Crea un sprint semanal para iniciar el delivery.</div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Histórico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(project.sprints || []).map((sprint) => (
            <div key={sprint.id} className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <div className="text-sm font-medium">{sprint.name}</div>
                <div className="text-xs text-muted-foreground">Objetivo: {sprint.goal}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="rounded-xl" variant={sprint.state === "DONE" ? "secondary" : "default"}>
                  {sprint.state}
                </Badge>
                <Badge className="rounded-xl" variant="outline">
                  QA: {sprint.qaGate.state}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SprintBoard({ project, sprint, moveCard, completeSprint, setData, role }) {
  const cols = [
    { id: "TODO", label: "To Do" },
    { id: "IN_PROGRESS", label: "In Progress" },
    { id: "CODE_REVIEW", label: "Code Review" },
    { id: "QA", label: "QA" },
    { id: "READY_FOR_DEMO", label: "Ready for Demo" },
    { id: "DONE", label: "Done" },
  ];

  const canQA = ["ADMIN", "QA"].includes(role);
  const canMove = ["ADMIN", "DEV", "PL", "TECH"].includes(role);

  const storyById = (id) => project.backlog.find((story) => story.id === id);

  const criticalOpen = (sprint.defects || []).some((defect) => defect.severity === "CRITICAL" && defect.status === "OPEN");

  const checklistOk = (sprint.checklist || []).every((check) => check.checked);

  const approveQAGate = () => {
    if (criticalOpen) return;
    if (!checklistOk) return;
    setData((prev) => {
      const projects = prev.projects.map((item) => {
        if (item.id !== project.id) return item;
        const sprints = item.sprints.map((itemSprint) =>
          itemSprint.id === sprint.id ? { ...itemSprint, qaGate: { ...itemSprint.qaGate, state: "APPROVED" } } : itemSprint
        );
        return { ...item, sprints };
      });
      return { ...prev, projects };
    });
  };

  const rejectQAGate = () => {
    setData((prev) => {
      const projects = prev.projects.map((item) => {
        if (item.id !== project.id) return item;
        const sprints = item.sprints.map((itemSprint) =>
          itemSprint.id === sprint.id ? { ...itemSprint, qaGate: { ...itemSprint.qaGate, state: "REJECTED" } } : itemSprint
        );
        return { ...item, sprints };
      });
      return { ...prev, projects };
    });
  };

  const toggleChecklist = (itemId, checked) => {
    setData((prev) => {
      const projects = prev.projects.map((item) => {
        if (item.id !== project.id) return item;
        const sprints = item.sprints.map((itemSprint) => {
          if (itemSprint.id !== sprint.id) return itemSprint;
          return {
            ...itemSprint,
            checklist: itemSprint.checklist.map((check) => (check.id === itemId ? { ...check, checked } : check)),
          };
        });
        return { ...item, sprints };
      });
      return { ...prev, projects };
    });
  };

  const closeCritical = () => {
    setData((prev) => {
      const projects = prev.projects.map((item) => {
        if (item.id !== project.id) return item;
        const sprints = item.sprints.map((itemSprint) => {
          if (itemSprint.id !== sprint.id) return itemSprint;
          return {
            ...itemSprint,
            defects: itemSprint.defects.map((defect) =>
              defect.severity === "CRITICAL" ? { ...defect, status: "CLOSED" } : defect
            ),
          };
        });
        return { ...item, sprints };
      });
      return { ...prev, projects };
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="rounded-2xl md:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{sprint.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Objetivo: {sprint.goal}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-xl" variant={sprint.qaGate.state === "APPROVED" ? "default" : "secondary"}>
                QA Gate: {sprint.qaGate.state}
              </Badge>
              <Button className="rounded-xl" variant="outline" onClick={completeSprint}>
                Cerrar Sprint
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {cols.map((column) => {
              const items = sprint.board.filter((card) => card.col === column.id);
              return (
                <div key={column.id} className="rounded-2xl border bg-muted/10 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium">{column.label}</div>
                    <Badge variant="secondary" className="rounded-xl">
                      {items.length}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {items.map((card) => {
                      const story = storyById(card.storyId);
                      return (
                        <div key={card.storyId} className="rounded-2xl border bg-background p-3 shadow-sm">
                          <div className="text-sm font-semibold">{card.storyId}</div>
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{story?.title}</div>
                          {canMove && (
                            <div className="mt-3">
                              <Select value={card.col} onValueChange={(value) => moveCard(card.storyId, value)}>
                                <SelectTrigger className="h-8 rounded-xl">
                                  <SelectValue placeholder="Mover" />
                                </SelectTrigger>
                                <SelectContent>
                                  {cols.map((col) => (
                                    <SelectItem key={col.id} value={col.id}>
                                      {col.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {items.length === 0 && (
                      <div className="rounded-xl border border-dashed bg-background/40 p-3 text-center text-xs text-muted-foreground">
                        Vacío
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Demo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Solo se debe hacer demo si QA Gate está <b>APPROVED</b>.
                </p>
                <Button
                  className="w-full rounded-xl"
                  disabled={sprint.qaGate.state !== "APPROVED"}
                  title={sprint.qaGate.state !== "APPROVED" ? "Bloqueado: QA Gate no aprobado" : ""}
                  onClick={() => {
                    setData((prev) => {
                      const projects = prev.projects.map((item) => {
                        if (item.id !== project.id) return item;
                        const sprints = item.sprints.map((itemSprint) =>
                          itemSprint.id === sprint.id
                            ? { ...itemSprint, demo: { accepted: true, note: "Aceptado por cliente" } }
                            : itemSprint
                        );
                        return { ...item, sprints };
                      });
                      return { ...prev, projects };
                    });
                  }}
                >
                  Registrar Demo (Aceptación)
                </Button>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Estado</div>
                  <div className="mt-1 text-sm font-medium">{sprint.demo.accepted ? "✅ Aceptado" : "—"}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Retro (express)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">En MVP guardamos 1 acción concreta.</p>
                <Input
                  className="rounded-xl"
                  placeholder="Acción: Mejorar definición de AC"
                  value={sprint.retro.action}
                  onChange={(event) => {
                    const action = event.target.value;
                    setData((prev) => {
                      const projects = prev.projects.map((item) => {
                        if (item.id !== project.id) return item;
                        const sprints = item.sprints.map((itemSprint) =>
                          itemSprint.id === sprint.id ? { ...itemSprint, retro: { ...itemSprint.retro, action } } : itemSprint
                        );
                        return { ...item, sprints };
                      });
                      return { ...prev, projects };
                    });
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">QA Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(sprint.checklist || []).map((item) => (
              <label key={item.id} className="flex items-center gap-2 rounded-xl border p-2">
                <Checkbox
                  checked={item.checked}
                  disabled={!canQA}
                  onCheckedChange={(value) => toggleChecklist(item.id, Boolean(value))}
                />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
            <div className="rounded-xl border p-3 text-xs text-muted-foreground">
              Checklist completo: <b>{checklistOk ? "Sí" : "No"}</b>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Defectos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(sprint.defects || []).map((defect) => (
              <div key={defect.id} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <div className="text-sm font-medium">{defect.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {defect.id} • {defect.severity} • {defect.status}
                  </div>
                </div>
                {defect.severity === "CRITICAL" && defect.status === "OPEN" && (
                  <Button className="rounded-xl" variant="outline" size="sm" onClick={closeCritical}>
                    Marcar resuelto
                  </Button>
                )}
              </div>
            ))}
            <div className="rounded-xl border p-3 text-xs text-muted-foreground">
              Críticos abiertos: <b>{criticalOpen ? "Sí" : "No"}</b>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">QA Gate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Reglas: requiere checklist completo y <b>0</b> defectos críticos abiertos.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="rounded-xl"
                disabled={!canQA || criticalOpen || !checklistOk}
                onClick={approveQAGate}
                title={
                  criticalOpen
                    ? "Bloqueado: defectos críticos abiertos"
                    : !checklistOk
                    ? "Bloqueado: checklist incompleto"
                    : ""
                }
              >
                Aprobar
              </Button>
              <Button className="rounded-xl" variant="outline" disabled={!canQA} onClick={rejectQAGate}>
                Rechazar
              </Button>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">Estado</div>
              <div className="mt-1 text-sm font-medium">{sprint.qaGate.state}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QAView({ project }) {
  const activeSprint = project.sprints.find((sprint) => sprint.state === "ACTIVE");
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">QA</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">En el MVP, QA se gestiona principalmente desde el sprint activo.</p>
        </CardHeader>
        <CardContent>
          {activeSprint ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border p-3">
                <div className="text-xs text-muted-foreground">Sprint</div>
                <div className="mt-1 text-sm font-medium">{activeSprint.name}</div>
              </div>
              <div className="rounded-2xl border p-3">
                <div className="text-xs text-muted-foreground">QA Gate</div>
                <div className="mt-1 text-sm font-medium">{activeSprint.qaGate.state}</div>
              </div>
              <div className="rounded-2xl border p-3">
                <div className="text-xs text-muted-foreground">Defectos</div>
                <div className="mt-1 text-sm font-medium">{activeSprint.defects.length}</div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay sprint activo. Crea uno desde “Sprints”.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChangesView({ project, setData, role }) {
  const canDecide = ["ADMIN", "PM", "PL"].includes(role);

  const [newCR, setNewCR] = useState({
    title: "",
    description: "",
    impactTimeWeeks: 1,
    impactROI: "Medio",
    impactQuality: "Bajo",
  });

  const addCR = () => {
    if (!newCR.title.trim()) return;
    setData((prev) => {
      const projects = prev.projects.map((item) => {
        if (item.id !== project.id) return item;
        const nextId = `CR-${(item.changeRequests?.length || 0) + 1}`;
        const cr = {
          id: nextId,
          title: newCR.title.trim(),
          description: newCR.description.trim(),
          impactTimeWeeks: Number(newCR.impactTimeWeeks) || 1,
          impactROI: newCR.impactROI,
          impactQuality: newCR.impactQuality,
          status: "PENDING",
          decisionNote: "",
        };
        return { ...item, changeRequests: [cr, ...(item.changeRequests || [])] };
      });
      return { ...prev, projects };
    });
    setNewCR({ title: "", description: "", impactTimeWeeks: 1, impactROI: "Medio", impactQuality: "Bajo" });
  };

  const decide = (id, status) => {
    setData((prev) => {
      const projects = prev.projects.map((item) => {
        if (item.id !== project.id) return item;
        const cr = item.changeRequests.find((entry) => entry.id === id);
        const changeRequests = item.changeRequests.map((entry) => (entry.id === id ? { ...entry, status } : entry));

        // If approved, add to backlog as DRAFT (rule: never into active sprint)
        let backlog = item.backlog;
        if (status === "APPROVED" && cr) {
          backlog = [
            {
              id: `US-CR-${id}`,
              title: `Cambio: ${cr.title}`,
              value: "Medium",
              priority: 99,
              acceptanceCriteria: ["Definir criterios de aceptación"],
              status: "DRAFT",
            },
            ...item.backlog,
          ];
        }

        return { ...item, changeRequests, backlog };
      });
      return { ...prev, projects };
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="rounded-2xl md:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Solicitudes de Cambio</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Regla: cambios aprobados <b>van al backlog</b> (nunca a sprint activo).
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Nueva solicitud
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Nueva solicitud de cambio</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="cr-title" className="text-xs font-medium">
                      Título
                    </label>
                    <Input
                      id="cr-title"
                      className="mt-1 rounded-xl"
                      value={newCR.title}
                      onChange={(event) => setNewCR((state) => ({ ...state, title: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="cr-description" className="text-xs font-medium">
                      Descripción
                    </label>
                    <Textarea
                      id="cr-description"
                      className="mt-1 min-h-[90px] rounded-2xl"
                      value={newCR.description}
                      onChange={(event) => setNewCR((state) => ({ ...state, description: event.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label htmlFor="cr-time" className="text-xs font-medium">
                        Tiempo (semanas)
                      </label>
                      <Input
                        id="cr-time"
                        type="number"
                        className="mt-1 rounded-xl"
                        value={newCR.impactTimeWeeks}
                        onChange={(event) => setNewCR((state) => ({ ...state, impactTimeWeeks: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="cr-roi" className="text-xs font-medium">
                        Impacto ROI
                      </label>
                      <Select
                        value={newCR.impactROI}
                        onValueChange={(value) => setNewCR((state) => ({ ...state, impactROI: value }))}
                      >
                        <SelectTrigger id="cr-roi" className="mt-1 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Alto">Alto</SelectItem>
                          <SelectItem value="Medio">Medio</SelectItem>
                          <SelectItem value="Bajo">Bajo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label htmlFor="cr-quality" className="text-xs font-medium">
                        Impacto Calidad
                      </label>
                      <Select
                        value={newCR.impactQuality}
                        onValueChange={(value) => setNewCR((state) => ({ ...state, impactQuality: value }))}
                      >
                        <SelectTrigger id="cr-quality" className="mt-1 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Alto">Alto</SelectItem>
                          <SelectItem value="Medio">Medio</SelectItem>
                          <SelectItem value="Bajo">Bajo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button className="rounded-xl" onClick={addCR}>
                    Crear
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(project.changeRequests || []).map((changeRequest) => (
            <div key={changeRequest.id} className="rounded-2xl border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">{changeRequest.id}</div>
                    <Badge className="rounded-xl" variant={changeRequest.status === "PENDING" ? "secondary" : "outline"}>
                      {changeRequest.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm">{changeRequest.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{changeRequest.description}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Pill>Tiempo: {changeRequest.impactTimeWeeks}w</Pill>
                    <Pill>ROI: {changeRequest.impactROI}</Pill>
                    <Pill>Calidad: {changeRequest.impactQuality}</Pill>
                  </div>
                </div>
                {canDecide && changeRequest.status === "PENDING" && (
                  <div className="flex items-center gap-2">
                    <Button className="rounded-xl" size="sm" onClick={() => decide(changeRequest.id, "APPROVED")}>
                      Aprobar
                    </Button>
                    <Button
                      className="rounded-xl"
                      size="sm"
                      variant="outline"
                      onClick={() => decide(changeRequest.id, "REJECTED")}
                    >
                      Rechazar
                    </Button>
                    <Button
                      className="rounded-xl"
                      size="sm"
                      variant="outline"
                      onClick={() => decide(changeRequest.id, "DEFERRED")}
                    >
                      Aplazar
                    </Button>
                  </div>
                )}
              </div>
              {changeRequest.status === "APPROVED" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  ✅ Se creó una historia en backlog: <b>US-CR-{changeRequest.id}</b> (DRAFT).
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Reglas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Regla</div>
            <div className="mt-1 font-medium">Cambios aprobados → Backlog</div>
            <div className="mt-2 text-xs text-muted-foreground">Nunca entran al sprint activo.</div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Sugerencia</div>
            <div className="mt-1 font-medium">Evaluar impacto en ROI</div>
            <div className="mt-2 text-xs text-muted-foreground">Si reduce ROI, considerar rechazo o replanteo.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportsView({ project }) {
  const data = [
    { name: "Cumplimiento", v: Math.round(project.kpis.weeklyDelivery * 100) },
    { name: "ROI est.", v: Math.round(project.kpis.roiEstimated * 100) },
    { name: "Rework", v: Math.round(project.kpis.reworkRate * 100) },
    { name: "Errores demo", v: project.kpis.demoErrors * 20 },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="rounded-2xl md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Reportes (Top KPIs)</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Vista simple para comité semanal (MVP).</p>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="v" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Semáforo ejecutivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Meta cumplimiento</div>
            <div className="mt-1 text-sm font-medium">≥ 90%</div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Meta errores demo</div>
            <div className="mt-1 text-sm font-medium">0</div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Meta ROI</div>
            <div className="mt-1 text-sm font-medium">≥ 30%</div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-muted-foreground">Lead time</div>
            <div className="mt-1 text-sm font-medium">{project.kpis.leadTimeDays} días</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LambdaProjectOS_MVP() {
  const [data, setData] = useState(initialData);
  const [active, setActive] = useState("PORTFOLIO");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("PM");
  const [companyId, setCompanyId] = useState("c1");
  const [currentProjectId, setCurrentProjectId] = useState("p1");

  const projectsInCompany = data.projects.filter((project) => project.companyId === companyId);
  const currentProject =
    projectsInCompany.find((project) => project.id === currentProjectId) ||
    projectsInCompany[0] ||
    data.projects[0];

  // keep project selection valid when switching company
  useEffect(() => {
    const list = data.projects.filter((project) => project.companyId === companyId);
    if (!list.find((project) => project.id === currentProjectId) && list[0]) {
      setCurrentProjectId(list[0].id);
    }
  }, [companyId, currentProjectId, data.projects]);

  const roleLabel = roleName(role);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <Sidebar active={active} setActive={setActive} />
        <div className="flex flex-1 flex-col">
          <div className="border-b bg-background">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-xl" variant="secondary">
                    Rol: {roleLabel}
                  </Badge>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground">Rol activo</span>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="h-9 w-[220px] rounded-xl">
                        <SelectValue placeholder="Rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator orientation="vertical" className="mx-2 h-6" />

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground">Empresa</span>
                    <Select value={companyId} onValueChange={setCompanyId}>
                      <SelectTrigger className="h-9 w-[220px] rounded-xl">
                        <SelectValue placeholder="Empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground">Proyecto</span>
                    <Select value={currentProjectId} onValueChange={setCurrentProjectId}>
                      <SelectTrigger className="h-9 w-[320px] rounded-xl">
                        <SelectValue placeholder="Proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectsInCompany.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    className="rounded-xl"
                    variant={currentProject.discovery.state === "APPROVED" ? "default" : "secondary"}
                  >
                    Discovery: {currentProject.discovery.state}
                  </Badge>
                  <Badge className="rounded-xl" variant={currentProject.status === "AT_RISK" ? "destructive" : "outline"}>
                    {statusLabel(currentProject.status)}
                  </Badge>
                </div>
              </div>
              <TopBar query={query} setQuery={setQuery} onClear={() => setQuery("")} />
            </div>
          </div>

          <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-6">
            {active === "PORTFOLIO" && (
              <PortfolioView
                data={data}
                currentProjectId={currentProjectId}
                setCurrentProjectId={(id) => {
                  setCurrentProjectId(id);
                  setActive("PROJECT");
                }}
                query={query}
              />
            )}

            {active === "PROJECT" && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="rounded-2xl">
                  <TabsTrigger value="overview" className="rounded-xl">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="discovery" className="rounded-xl">
                    Discovery
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-4">
                  <ProjectOverview data={data} project={currentProject} setData={setData} role={role} />
                </TabsContent>
                <TabsContent value="discovery" className="mt-4">
                  <DiscoveryView project={currentProject} setData={setData} role={role} />
                </TabsContent>
              </Tabs>
            )}

            {active === "BACKLOG" && (
              <BacklogView project={currentProject} setData={setData} role={role} query={query} />
            )}

            {active === "SPRINTS" && <SprintsView project={currentProject} setData={setData} role={role} />}

            {active === "QA" && <QAView project={currentProject} />}

            {active === "CHANGES" && <ChangesView project={currentProject} setData={setData} role={role} />}

            {active === "REPORTS" && <ReportsView project={currentProject} />}
          </main>

          <footer className="border-t bg-background">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs text-muted-foreground">
              <div>© {new Date().getFullYear()} Lambda Project OS • MVP</div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border px-2 py-0.5">Sprint semanal</span>
                <span className="rounded-full border px-2 py-0.5">Discovery Gate</span>
                <span className="rounded-full border px-2 py-0.5">QA Gate</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
