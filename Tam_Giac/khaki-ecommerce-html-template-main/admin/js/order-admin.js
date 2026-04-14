(function () {
  var admin = window.TamGiacAdmin;
  if (!admin) {
    return;
  }

  var STATUS_LABELS = {
    pending: "Pending confirmation",
    paid: "Paid",
    pending_vnpay: "Awaiting VNPay payment",
    paid_vnpay: "Paid via VNPay",
    failed_vnpay: "VNPay payment failed",
    cancelled_vnpay: "VNPay payment cancelled",
    expired_vnpay: "VNPay payment expired"
  };
  var state = {
    orders: [],
    selectedOrderId: "",
    query: "",
    filterStatus: "all"
  };

  function getVisibleOrders() {
    return state.orders.filter(function (order) {
      var matchesStatus =
        state.filterStatus === "all" || String(order.status || "").toLowerCase() === state.filterStatus;
      var haystack = [
        order.reference,
        order.customerName,
        order.customerEmail,
        order.paymentLabel
      ]
        .join(" ")
        .toLowerCase();
      var matchesQuery = !state.query || haystack.indexOf(state.query) !== -1;
      return matchesStatus && matchesQuery;
    });
  }

  function buildStatusOptions(selectedStatus) {
    return Object.keys(STATUS_LABELS)
      .map(function (status) {
        return (
          '<option value="' +
          admin.escapeHtml(status) +
          '"' +
          (status === selectedStatus ? " selected" : "") +
          ">" +
          admin.escapeHtml(STATUS_LABELS[status]) +
          "</option>"
        );
      })
      .join("");
  }

  function renderOrders() {
    var tbody = document.getElementById("adminOrdersTable");
    if (!tbody) {
      return;
    }

    var visibleOrders = getVisibleOrders();
    if (!visibleOrders.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="admin-empty-cell">No orders match the current filter.</td></tr>';
      return;
    }

    tbody.innerHTML = visibleOrders
      .map(function (order) {
        return [
          '<tr data-order-id="' + admin.escapeHtml(order.id) + '">',
          "<td>" + admin.escapeHtml(admin.formatDateTime(order.createdAt)) + "</td>",
          "<td>" + admin.escapeHtml(order.reference) + "</td>",
          "<td>" + admin.escapeHtml(order.customerName || order.customerEmail || "Customer") + "</td>",
          "<td>" + admin.escapeHtml(admin.formatPrice(order.totalAmount)) + "</td>",
          "<td>" + admin.escapeHtml(order.paymentLabel || "COD") + "</td>",
          '<td><select data-action="status">' + buildStatusOptions(order.status) + "</select></td>",
          '<td><button type="button" data-action="view">View</button></td>',
          '<td><button type="button" data-action="delete">Delete</button></td>',
          "</tr>"
        ].join("");
      })
      .join("");
  }

  function renderOrderDetail(order) {
    var panel = document.getElementById("adminOrderDetail");
    if (!panel) {
      return;
    }

    if (!order) {
      panel.innerHTML = '<p class="admin-note">Select an order to inspect its items and customer details.</p>';
      return;
    }

    var itemRows = (order.items || [])
      .map(function (item) {
        return [
          "<tr>",
          "<td>" + admin.escapeHtml(item.productName || "Product") + "</td>",
          "<td>" + admin.escapeHtml(item.categoryName || "Catalog") + "</td>",
          "<td>" + admin.escapeHtml(String(item.quantity || 0)) + "</td>",
          "<td>" + admin.escapeHtml(admin.formatPrice(item.price)) + "</td>",
          "</tr>"
        ].join("");
      })
      .join("");

    panel.innerHTML = [
      '<div class="admin-detail-grid">',
      '<div class="admin-detail-card"><h4>Order summary</h4><p><strong>Reference:</strong> ' + admin.escapeHtml(order.reference) + '</p><p><strong>Status:</strong> ' + admin.escapeHtml(order.statusLabel || STATUS_LABELS[order.status] || "Pending") + '</p><p><strong>Payment:</strong> ' + admin.escapeHtml(order.paymentLabel || "COD") + '</p><p><strong>Total:</strong> ' + admin.escapeHtml(admin.formatPrice(order.totalAmount)) + '</p></div>',
      '<div class="admin-detail-card"><h4>Customer</h4><p><strong>Name:</strong> ' + admin.escapeHtml(order.customerName || "-") + '</p><p><strong>Email:</strong> ' + admin.escapeHtml(order.customerEmail || "-") + '</p><p><strong>Phone:</strong> ' + admin.escapeHtml(order.customerPhone || "-") + '</p><p><strong>Address:</strong> ' + admin.escapeHtml(order.shippingAddress ? [order.shippingAddress.addressLine, order.shippingAddress.city, order.shippingAddress.country].filter(Boolean).join(", ") : "No saved shipping address") + '</p></div>',
      "</div>",
      '<div class="content-detail"><h4>Order items</h4><table><thead><tr><th>Product</th><th>Category</th><th>Qty</th><th>Price</th></tr></thead><tbody>' +
        (itemRows || '<tr><td colspan="4" class="admin-empty-cell">No items in this order.</td></tr>') +
      "</tbody></table></div>"
    ].join("");
  }

  async function loadOrders() {
    state.orders = await admin.apiCall("/admin/orders");
    renderOrders();

    var selectedOrder = state.orders.find(function (order) {
      return order.id === state.selectedOrderId;
    });
    renderOrderDetail(selectedOrder || state.orders[0] || null);
    if (!selectedOrder && state.orders[0]) {
      state.selectedOrderId = state.orders[0].id;
    }
    admin.setStatus("ordersStatus", "Orders synced with the backend.");
  }

  function bindFilters() {
    var searchInput = document.getElementById("orderSearch");
    var statusFilter = document.getElementById("orderStatusFilter");

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        state.query = String(searchInput.value || "").trim().toLowerCase();
        renderOrders();
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", function () {
        state.filterStatus = String(statusFilter.value || "all");
        renderOrders();
      });
    }
  }

  function bindTableActions() {
    var tbody = document.getElementById("adminOrdersTable");
    if (!tbody) {
      return;
    }

    tbody.addEventListener("click", async function (event) {
      var button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }

      var row = button.closest("tr[data-order-id]");
      if (!row) {
        return;
      }

      var orderId = row.getAttribute("data-order-id");
      var order = state.orders.find(function (entry) {
        return entry.id === orderId;
      });

      if (!order) {
        return;
      }

      if (button.getAttribute("data-action") === "view") {
        state.selectedOrderId = order.id;
        renderOrderDetail(order);
        admin.setStatus("ordersStatus", "Viewing order " + order.reference + ".");
        return;
      }

      if (!window.confirm("Delete this order from the admin panel?")) {
        return;
      }

      try {
        await admin.apiCall("/admin/orders/" + encodeURIComponent(orderId), {
          method: "DELETE"
        });
        admin.setStatus("ordersStatus", "Order deleted.");
        if (state.selectedOrderId === orderId) {
          state.selectedOrderId = "";
        }
        await loadOrders();
      } catch (error) {
        admin.setStatus("ordersStatus", error.error || "Unable to delete the order.", true);
      }
    });

    tbody.addEventListener("change", async function (event) {
      var select = event.target.closest('select[data-action="status"]');
      if (!select) {
        return;
      }

      var row = select.closest("tr[data-order-id]");
      if (!row) {
        return;
      }

      var orderId = row.getAttribute("data-order-id");

      try {
        var result = await admin.apiCall("/admin/orders/" + encodeURIComponent(orderId), {
          method: "PATCH",
          body: JSON.stringify({
            status: select.value
          })
        });

        state.orders = state.orders.map(function (order) {
          return order.id === orderId ? result.order : order;
        });

        if (state.selectedOrderId === orderId) {
          renderOrderDetail(result.order);
        }

        renderOrders();
        admin.setStatus("ordersStatus", "Order status updated.");
      } catch (error) {
        admin.setStatus("ordersStatus", error.error || "Unable to update order status.", true);
        await loadOrders();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindFilters();
    bindTableActions();

    admin.initPage({
      statusId: "ordersStatus",
      onReady: loadOrders
    });
  });
})();
