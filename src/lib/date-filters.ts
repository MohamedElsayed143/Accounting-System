export function isDateInFilter(dateInput: string | Date, filter: "today" | "week" | "month" | "year" | "all") {
  if (filter === "all") return true;
  const date = new Date(dateInput);
  const now = new Date();
  
  if (filter === "today") {
    return date.toDateString() === now.toDateString();
  }
  
  if (filter === "week") {
    const startOfWeek = new Date(now);
    // Assuming Sunday is the start of the week. For Egypt (Saturday), you might adjust this, but Sunday or moving 7 days back works too.
    // Let's do last 7 days for "week" which is more practical
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);
    return date >= startOfWeek;
  }
  
  if (filter === "month") {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  
  if (filter === "year") {
    return date.getFullYear() === now.getFullYear();
  }
  
  return true;
}
