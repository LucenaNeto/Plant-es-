export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

export function formatShiftWindow(shift: {
  dateLabel: string;
  endTime: string;
  startTime: string;
}) {
  return `${shift.dateLabel}, ${shift.startTime} - ${shift.endTime}`;
}
