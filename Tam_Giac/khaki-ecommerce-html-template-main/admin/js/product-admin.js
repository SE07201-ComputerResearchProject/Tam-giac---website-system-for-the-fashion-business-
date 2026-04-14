(function () {
  var admin = window.TamGiacAdmin;
  if (!admin) {
    return;
  }

  var state = {
    products: [],
    categories: [],
    editingId: ""
  };

  function setFormMode(editing) {
    var title = document.getElementById("productFormTitle");
    var submit = document.getElementById("productSubmit");

    if (title) {
      title.textContent = editing ? "Edit Product" : "Add Product";
    }

    if (submit) {
      submit.value = editing ? "Save Changes" : "Add Product";
    }
  }

  function resetForm() {
    state.editingId = "";
    var form = document.getElementById("productAdminForm");
    if (form) {
      form.reset();
    }

    var productId = document.getElementById("productId");
    if (productId) {
      productId.value = "";
    }

    setFormMode(false);
  }

  function renderCategoryOptions() {
    var select = document.getElementById("categoryId");
    if (!select) {
      return;
    }

    select.innerHTML = ['<option value="">-- Select category --</option>']
      .concat(
        state.categories.map(function (category) {
          return '<option value="' + admin.escapeHtml(category.id) + '">' + admin.escapeHtml(category.name) + "</option>";
        })
      )
      .join("");
  }

  function fillForm(product) {
    state.editingId = product.id;
    document.getElementById("productId").value = product.id;
    document.getElementById("pname").value = product.name || "";
    document.getElementById("price").value = Number(product.price || 0);
    document.getElementById("stock").value = Number(product.stock || 0);
    document.getElementById("categoryId").value = product.categoryId || "";
    document.getElementById("categoryName").value = "";
    document.getElementById("sdesc").value = product.descriptionShort || "";
    document.getElementById("imageUrl").value = product.image || "";
    setFormMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderProducts() {
    var tbody = document.getElementById("adminProductsTable");
    if (!tbody) {
      return;
    }

    if (!state.products.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="admin-empty-cell">No products found.</td></tr>';
      return;
    }

    tbody.innerHTML = state.products
      .map(function (product) {
        return [
          '<tr data-product-id="' + admin.escapeHtml(product.id) + '">',
          "<td>" + admin.escapeHtml(product.name) + "</td>",
          "<td>" + admin.escapeHtml(admin.formatPrice(product.price)) + "</td>",
          "<td>" + admin.escapeHtml(product.categoryName || "Catalog") + "</td>",
          "<td>" + admin.escapeHtml(product.isActive ? "Active" : "Hidden") + "</td>",
          '<td><button type="button" data-action="edit">Edit</button></td>',
          '<td>' +
            (product.isActive
              ? '<button type="button" data-action="delete">Hide</button>'
              : '<button type="button" data-action="restore">Restore</button>') +
          "</td>",
          "</tr>"
        ].join("");
      })
      .join("");
  }

  async function loadProducts() {
    state.products = await admin.apiCall("/admin/products?includeInactive=true");
    renderProducts();
  }

  async function loadCategories() {
    state.categories = await admin.apiCall("/admin/categories");
    renderCategoryOptions();
  }

  async function bootstrap() {
    await Promise.all([loadCategories(), loadProducts()]);
    admin.setStatus("adminStatus", "Product manager connected.");
  }

  function bindForm() {
    var form = document.getElementById("productAdminForm");
    var cancel = document.getElementById("productCancel");

    if (cancel) {
      cancel.addEventListener("click", function () {
        resetForm();
        admin.setStatus("adminStatus", "Product form reset.");
      });
    }

    if (!form) {
      return;
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var payload = {
        name: document.getElementById("pname").value.trim(),
        price: Number(document.getElementById("price").value || 0),
        stock: Number(document.getElementById("stock").value || 0),
        categoryId: document.getElementById("categoryId").value || "",
        categoryName: document.getElementById("categoryName").value.trim(),
        description: document.getElementById("sdesc").value.trim(),
        imageUrl: document.getElementById("imageUrl").value.trim()
      };

      try {
        if (state.editingId) {
          await admin.apiCall("/admin/products/" + encodeURIComponent(state.editingId), {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          admin.setStatus("adminStatus", "Product updated successfully.");
        } else {
          await admin.apiCall("/admin/products", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          admin.setStatus("adminStatus", "Product created successfully.");
        }

        resetForm();
        await Promise.all([loadCategories(), loadProducts()]);
      } catch (error) {
        admin.setStatus("adminStatus", error.error || "Unable to save the product.", true);
      }
    });
  }

  function bindTableActions() {
    var tbody = document.getElementById("adminProductsTable");
    if (!tbody) {
      return;
    }

    tbody.addEventListener("click", async function (event) {
      var button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }

      var row = button.closest("tr[data-product-id]");
      if (!row) {
        return;
      }

      var productId = row.getAttribute("data-product-id");
      var product = state.products.find(function (item) {
        return item.id === productId;
      });

      if (!product) {
        return;
      }

      var action = button.getAttribute("data-action");

      if (action === "edit") {
        fillForm(product);
        admin.setStatus("adminStatus", "Editing product: " + product.name);
        return;
      }

      try {
        if (action === "delete") {
          if (!window.confirm("Hide this product from the storefront?")) {
            return;
          }

          await admin.apiCall("/admin/products/" + encodeURIComponent(productId), {
            method: "DELETE"
          });
          admin.setStatus("adminStatus", "Product hidden successfully.");
        }

        if (action === "restore") {
          await admin.apiCall("/admin/products/" + encodeURIComponent(productId) + "/restore", {
            method: "POST"
          });
          admin.setStatus("adminStatus", "Product restored successfully.");
        }

        await loadProducts();
      } catch (error) {
        admin.setStatus("adminStatus", error.error || "Unable to update the product status.", true);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindForm();
    bindTableActions();

    admin.initPage({
      statusId: "adminStatus",
      onReady: bootstrap
    });
  });
})();
