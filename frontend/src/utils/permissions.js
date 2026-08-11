// Simple lightweight role-based action checker
export function canPerform(action, role) {
  if (!role) return false;
  const r = role.toLowerCase();
  if (r === "admin") return true;

  switch (action) {
    case "manage_customers": // Add/Edit customer & followups
      return r === "sales";
    case "manage_products": // Add/Edit product & Adjust stock
      return r === "warehouse";
    case "view_stock_movements": // Stock movement log button
      return r === "warehouse" || r === "accounts";
    case "manage_challans": // Create, Confirm, Cancel Challan
      return r === "sales";
    default:
      return false;
  }
}
