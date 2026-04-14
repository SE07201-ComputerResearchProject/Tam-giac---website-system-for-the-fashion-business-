(function () {
  var admin = window.TamGiacAdmin;
  if (!admin) {
    return;
  }

  var state = {
    categories: [],
    editingId: ""
  };

  function setFormMode(editing) {
    var title = document.getElementById("categoryFormTitle");
    var submit = document.getElementById("categorySubmit");

    if (title) {
      title.textContent = editing ? "Edit Category" : "Add Category";
    }

    if (submit) {
      submit.value = editing ? "Save Category" : "Add Category";
    }
  }

  function resetForm() {
    state.editingId = "";
    var form = document.getElementById("categoryAdminForm");
    if (form) {
      form.reset();
    }
    setFormMode(false);
  }

  function fillForm(category) {
    state.editingId = category.id;
    document.getElementById("categoryNameInput").value = category.name || "";
    document.getElementById("categoryDescriptionInput").value = category.description || "";
    setFormMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderCategories() {
    var tbody = document.getElementById("adminCategoriesTable");
    if (!tbody) {
      return;
    }

    if (!state.categories.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="admin-empty-cell">No categories found.</td></tr>';
      return;
    }

    tbody.innerHTML = state.categories
      .map(function (category) {
        return [
          '<tr data-category-id="' + admin.escapeHtml(category.id) + '">',
          "<td>" + admin.escapeHtml(category.name) + "</td>",
          "<td>" + admin.escapeHtml(category.description || "Managed from admin panel") + "</td>",
          "<td>" + admin.escapeHtml(String(category.productCount || 0)) + "</td>",
          '<td><button type="button" data-action="edit">Edit</button></td>',
          '<td><button type="button" data-action="delete">Delete</button></td>',
          "</tr>"
        ].join("");
      })
      .join("");
  }

  async function loadCategories() {
    state.categories = await admin.apiCall("/admin/categories");
    renderCategories();
    admin.setStatus("categoryStatus", "Category list is up to date.");
  }

  function bindForm() {
    var form = document.getElementById("categoryAdminForm");
    var cancel = document.getElementById("categoryCancel");

    if (cancel) {
      cancel.addEventListener("click", function () {
        resetForm();
        admin.setStatus("categoryStatus", "Category form reset.");
      });
    }

    if (!form) {
      return;
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var payload = {
        name: document.getElementById("categoryNameInput").value.trim(),
        description: document.getElementById("categoryDescriptionInput").value.trim()
      };

      try {
        if (state.editingId) {
          await admin.apiCall("/admin/categories/" + encodeURIComponent(state.editingId), {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          admin.setStatus("categoryStatus", "Category updated successfully.");
        } else {
          await admin.apiCall("/admin/categories", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          admin.setStatus("categoryStatus", "Category created successfully.");
        }

        resetForm();
        await loadCategories();
      } catch (error) {
        admin.setStatus("categoryStatus", error.error || "Unable to save the category.", true);
      }
    });
  }

  function bindTableActions() {
    var tbody = document.getElementById("adminCategoriesTable");
    if (!tbody) {
      return;
    }

    tbody.addEventListener("click", async function (event) {
      var button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }

      var row = button.closest("tr[data-category-id]");
      if (!row) {
        return;
      }

      var categoryId = row.getAttribute("data-category-id");
      var category = state.categories.find(function (item) {
        return item.id === categoryId;
      });

      if (!category) {
        return;
      }

      if (button.getAttribute("data-action") === "edit") {
        fillForm(category);
        admin.setStatus("categoryStatus", "Editing category: " + category.name);
        return;
      }

      if (!window.confirm("Delete this category? Products will be detached from it.")) {
        return;
      }

      try {
        await admin.apiCall("/admin/categories/" + encodeURIComponent(categoryId), {
          method: "DELETE"
        });
        admin.setStatus("categoryStatus", "Category deleted.");
        if (state.editingId === categoryId) {
          resetForm();
        }
        await loadCategories();
      } catch (error) {
        admin.setStatus("categoryStatus", error.error || "Unable to delete the category.", true);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindForm();
    bindTableActions();

    admin.initPage({
      statusId: "categoryStatus",
      onReady: loadCategories
    });
  });
})();
