export const sampleFinance = {
  expenses: 860,
  netEstimated: 9140,
  pending: 3400,
  predicted: 10000,
  received: 5200,
  shiftCount: 8,
};

export const sampleUnits = [
  {
    city: "São Paulo",
    defaultHours: 12,
    defaultValue: 1400,
    isFixed: true,
    monthValue: 5600,
    name: "Hospital Santa Clara",
    type: "Hospital",
  },
  {
    city: "Guarulhos",
    defaultHours: 12,
    defaultValue: 1200,
    isFixed: false,
    monthValue: 2400,
    name: "UPA Norte",
    type: "UPA",
  },
  {
    city: "São Paulo",
    defaultHours: 6,
    defaultValue: 800,
    isFixed: false,
    monthValue: 1600,
    name: "Clínica Vida",
    type: "Clínica",
  },
];

export const sampleShifts = [
  {
    dateLabel: "20 ago",
    endTime: "19:00",
    id: "shift-1",
    modality: "green",
    modalityLabel: "Verde",
    paymentStatus: "predicted",
    paymentStatusLabel: "Previsto",
    startTime: "07:00",
    typeLabel: "Fixo",
    unit: "Hospital Santa Clara",
    value: 1400,
  },
  {
    dateLabel: "23 ago",
    endTime: "07:00",
    id: "shift-2",
    modality: "yellow",
    modalityLabel: "Amarelo",
    paymentStatus: "pending",
    paymentStatusLabel: "Pendente",
    startTime: "19:00",
    typeLabel: "Extra",
    unit: "UPA Norte",
    value: 1200,
  },
  {
    dateLabel: "27 ago",
    endTime: "13:00",
    id: "shift-3",
    modality: "red",
    modalityLabel: "Vermelho",
    paymentStatus: "received",
    paymentStatusLabel: "Recebido",
    startTime: "07:00",
    typeLabel: "Repasse",
    unit: "Clínica Vida",
    value: 800,
  },
] as const;

export const modalityStyles = {
  green: "bg-teal-50 text-teal-700",
  red: "bg-rose-50 text-rose-700",
  yellow: "bg-amber-50 text-amber-700",
};

export const paymentStatusStyles = {
  pending: "bg-amber-50 text-amber-700",
  predicted: "bg-zinc-100 text-zinc-700",
  received: "bg-indigo-50 text-indigo-700",
};

export const sampleCalendarDays = Array.from({ length: 35 }, (_, index) => {
  const day = index - 3;
  const date = `2026-08-${String(Math.max(day, 1)).padStart(2, "0")}`;

  return {
    date: `${date}-${index}`,
    day: day > 0 && day <= 31 ? day : "",
    modality:
      day === 20 ? "green" : day === 23 ? "yellow" : day === 27 ? "red" : null,
  };
});

export const sampleExpenses = [
  {
    amount: 320,
    category: "Combustível",
    dateLabel: "12 ago",
    description: "Abastecimento",
    id: "expense-1",
    linkedTo: "Vinculado ao Hospital Santa Clara",
  },
  {
    amount: 180,
    category: "Alimentação",
    dateLabel: "15 ago",
    description: "Refeições em plantão",
    id: "expense-2",
    linkedTo: "Gasto geral do mês",
  },
  {
    amount: 90,
    category: "Estacionamento",
    dateLabel: "20 ago",
    description: "Estacionamento hospitalar",
    id: "expense-3",
    linkedTo: "Vinculado ao plantão de 20 ago",
  },
];

export const sampleExpenseGroups = [
  { amount: 320, category: "Combustível" },
  { amount: 180, category: "Alimentação" },
  { amount: 90, category: "Estacionamento" },
];
