(function () {
  var admin = window.TamGiacAdmin;
  if (!admin) {
    return;
  }

  var state = {
    rows: []
  };

  function renderProductOptions() {
    var select = document.getElementById("stockProductId");
    if (!select) {
      return;
    }

    select.innerHTML = ['<option value="">-- Select a product --</option>']
      .concat(
        state.rows.map(function (row) {
          return '<option value="' + admin.escapeHtml(row.id) + '">' + admin.escapeHtml(row.name) + "</option>";
        })
      )
      .join("");
  }

  function renderTable() {
    var tbody = document.getElementById("adminStockTable");
    if (!tbody) {
      return;
    }

    if (!state.rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="admin-empty-cell">No stock data available.</td></tr>';
      return;
    }

    tbody.innerHTML = state.rows
      .map(function (row) {
        return [
          "<tr>",
          "<td>" + admin.escapeHtml(row.name) + "</td>",
          "<td>" + admin.escapeHtml(row.categoryName || "Catalog") + "</td>",
          "<td>" + admin.escapeHtml(String(row.stockIn || 0)) + "</td>",
          "<td>" + admin.escapeHtml(String(row.soldUnits || 0)) + "</td>",
          '<td><span class="admin-chip ' + (row.lowStock ? "admin-chip-warning" : "admin-chip-success") + '">' +
            admin.escapeHtml(String(row.availableStock || 0)) + "</span></td>",
          "</tr>"
        ].join("");
      })
      .join("");
  }

  async function loadStock() {
    var response = await admin.apiCall("/admin/stock");
    state.rows = Array.isArray(response.rows) ? response.rows : [];
    renderProductOptions();
    renderTable();
    admin.setStatus(
      "stockStatus",
      "Stock synced. Low stock threshold: " + admin.escapeHtml(String(response.lowStockThreshold || 0))
    );
  }

  function bindForm() {
    var form = document.getElementById("stockAdminForm");
    if (!form) {
      return;
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var productId = document.getElementById("stockProductId").value;
      var quantity = Number(document.getElementById("stockQuantity").value || 0);

      if (!productId) {
        admin.setStatus("stockStatus", "Please choose a product first.", true);
        return;
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        admin.setStatus("stockStatus", "Quantity must be greater than 0.", true);
        return;
      }

      try {
        await admin.apiCall("/admin/products/" + encodeURIComponent(productId) + "/stock", {
          method: "POST",
          body: JSON.stringify({ quantity: quantity })
        });
        form.reset();
        admin.setStatus("stockStatus", "Stock updated successfully.");
        await loadStock();
      } catch (error) {
        admin.setStatus("stockStatus", error.error || "Unable to update stock.", true);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindForm();
    admin.initPage({
      statusId: "stockStatus",
      onReady: loadStock
    });
  });
})();
