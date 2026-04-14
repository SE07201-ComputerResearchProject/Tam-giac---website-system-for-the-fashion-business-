(function () {
  var admin = window.TamGiacAdmin;
  if (!admin) {
    return;
  }

  var state = {
    users: []
  };

  function renderSummary() {
    var container = document.getElementById("adminUsersSummary");
    if (!container) {
      return;
    }

    var stats = {
      total: state.users.length,
      admins: state.users.filter(function (user) { return user.role === "admin"; }).length,
      verified: state.users.filter(function (user) { return user.isVerified; }).length,
      disabled: state.users.filter(function (user) { return !user.isActive; }).length
    };

    container.innerHTML = [
      ['Users', stats.total],
      ['Admins', stats.admins],
      ['Verified', stats.verified],
      ['Disabled', stats.disabled]
    ]
      .map(function (entry) {
        return [
          '<div class="admin-stat-card">',
          '<span class="admin-stat-label">' + admin.escapeHtml(entry[0]) + '</span>',
          '<strong class="admin-stat-value">' + admin.escapeHtml(String(entry[1])) + '</strong>',
          '</div>'
        ].join("");
      })
      .join("");
  }

  function renderUsers() {
    var tbody = document.getElementById("adminUsersTable");
    if (!tbody) {
      return;
    }

    if (!state.users.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="admin-empty-cell">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = state.users
      .map(function (user) {
        return [
          '<tr data-user-id="' + admin.escapeHtml(user.id) + '">',
          "<td>" + admin.escapeHtml(user.fullName || "-") + "</td>",
          "<td>" + admin.escapeHtml(user.email) + "</td>",
          "<td>" + admin.escapeHtml(String(user.orderCount || 0)) + "</td>",
          '<td><select data-field="role"><option value="user"' + (user.role === "user" ? " selected" : "") + '>User</option><option value="admin"' + (user.role === "admin" ? " selected" : "") + '>Admin</option></select></td>',
          '<td><select data-field="isVerified"><option value="true"' + (user.isVerified ? " selected" : "") + '>Verified</option><option value="false"' + (!user.isVerified ? " selected" : "") + '>Unverified</option></select></td>',
          '<td><select data-field="isActive"><option value="true"' + (user.isActive ? " selected" : "") + '>Active</option><option value="false"' + (!user.isActive ? " selected" : "") + '>Disabled</option></select></td>',
          '<td><button type="button" data-action="save">Save</button></td>',
          "</tr>"
        ].join("");
      })
      .join("");
  }

  async function loadUsers() {
    state.users = await admin.apiCall("/admin/users");
    renderSummary();
    renderUsers();
    admin.setStatus("usersStatus", "User list is live.");
  }

  function bindTableActions() {
    var tbody = document.getElementById("adminUsersTable");
    if (!tbody) {
      return;
    }

    tbody.addEventListener("click", async function (event) {
      var button = event.target.closest('button[data-action="save"]');
      if (!button) {
        return;
      }

      var row = button.closest("tr[data-user-id]");
      if (!row) {
        return;
      }

      var userId = row.getAttribute("data-user-id");
      var payload = {
        role: row.querySelector('select[data-field="role"]').value,
        isVerified: row.querySelector('select[data-field="isVerified"]').value === "true",
        isActive: row.querySelector('select[data-field="isActive"]').value === "true"
      };

      try {
        var result = await admin.apiCall("/admin/users/" + encodeURIComponent(userId), {
          method: "PATCH",
          body: JSON.stringify(payload)
        });

        state.users = state.users.map(function (user) {
          return user.id === userId ? result.user : user;
        });
        renderSummary();
        renderUsers();
        admin.setStatus("usersStatus", "User updated successfully.");
      } catch (error) {
        admin.setStatus("usersStatus", error.error || "Unable to update this user.", true);
        await loadUsers();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindTableActions();
    admin.initPage({
      statusId: "usersStatus",
      onReady: loadUsers
    });
  });
})();
