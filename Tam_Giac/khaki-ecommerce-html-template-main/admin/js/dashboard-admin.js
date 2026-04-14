(function () {
  var admin = window.TamGiacAdmin;
  if (!admin) {
    return;
  }

  function renderStatCards(stats) {
    var container = document.getElementById("adminDashboardStats");
    if (!container) {
      return;
    }

    var cards = [
      ["Active products", stats.activeProducts],
      ["Hidden products", stats.hiddenProducts],
      ["Categories", stats.categories],
      ["Users", stats.users],
      ["Total orders", stats.totalOrders],
      ["Pending orders", stats.pendingOrders],
      ["Completed orders", stats.completedOrders],
      ["Low stock alerts", stats.lowStockItems]
    ];

    container.innerHTML = cards
      .map(function (entry) {
        return [
          '<div class="admin-stat-card">',
          '<span class="admin-stat-label">' + admin.escapeHtml(entry[0]) + "</span>",
          '<strong class="admin-stat-value">' + admin.escapeHtml(String(entry[1] || 0)) + "</strong>",
          "</div>"
        ].join("");
      })
      .join("");
  }

  function renderLowStock(rows) {
    var tbody = document.getElementById("dashboardLowStockTable");
    if (!tbody) {
      return;
    }

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="admin-empty-cell">No low stock items right now.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map(function (row) {
        return [
          "<tr>",
          "<td>" + admin.escapeHtml(row.name) + "</td>",
          "<td>" + admin.escapeHtml(admin.formatPrice(row.price)) + "</td>",
          "<td>" + admin.escapeHtml(row.categoryName || "Catalog") + "</td>",
          '<td><span class="admin-chip admin-chip-warning">' + admin.escapeHtml(String(row.availableStock)) + "</span></td>",
          "</tr>"
        ].join("");
      })
      .join("");
  }

  function renderOrders(tableId, rows, emptyMessage) {
    var tbody = document.getElementById(tableId);
    if (!tbody) {
      return;
    }

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="admin-empty-cell">' + admin.escapeHtml(emptyMessage) + "</td></tr>";
      return;
    }

    tbody.innerHTML = rows
      .map(function (order) {
        return [
          "<tr>",
          "<td>" + admin.escapeHtml(admin.formatDateTime(order.createdAt)) + "</td>",
          "<td>" + admin.escapeHtml(order.reference) + "</td>",
          "<td>" + admin.escapeHtml(order.customerName || order.customerEmail || "Customer") + "</td>",
          "<td>" + admin.escapeHtml(admin.formatPrice(order.totalAmount)) + "</td>",
          "<td>" + admin.escapeHtml(order.statusLabel || "Pending") + "</td>",
          "</tr>"
        ].join("");
      })
      .join("");
  }

  async function loadDashboard() {
    var response = await admin.apiCall("/admin/dashboard");
    renderStatCards(response.stats || {});
    renderLowStock(response.lowStockProducts || []);
    renderOrders("dashboardRecentOrdersTable", response.recentOrders || [], "No recent orders yet.");
    renderOrders("dashboardCompletedOrdersTable", response.completedOrders || [], "No completed orders yet.");
    admin.setStatus("dashboardStatus", "Dashboard synced with live admin data.");
  }

  document.addEventListener("DOMContentLoaded", function () {
    admin.initPage({
      statusId: "dashboardStatus",
      onReady: loadDashboard
    });
  });
})();
