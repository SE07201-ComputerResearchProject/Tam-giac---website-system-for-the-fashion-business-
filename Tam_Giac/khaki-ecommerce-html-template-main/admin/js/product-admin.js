(function () {
  var API_BASE = "http://127.0.0.1:3002/api";
  var TOKEN_KEY = "token";
  var state = {
    products: [],
    categories: [],
    editingId: ""
  };

  function getToken() {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  function setStatus(message, isError) {
    var node = document.getElementById("adminStatus");
    if (!node) {
      return;
    }

    node.textContent = message || "";
    node.style.color = isError ? "#b42318" : "#555";
  }

  async function apiCall(endpoint, options) {
    var token = getToken();
    if (!token) {
      throw { error: "Bạn chưa đăng nhập." };
    }

    var config = Object.assign(
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        }
      },
      options || {}
    );

    var response;
    try {
      response = await fetch(API_BASE + endpoint, config);
    } catch (error) {
      throw { error: "Không thể kết nối backend admin." };
    }

    var payload = await response.json().catch(function () {
      return { error: "Admin API error" };
    });

    if (!response.ok) {
      throw payload;
    }

    return payload;
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " d";
  }

  function renderCategoryOptions() {
    var select = document.getElementById("categoryId");
    if (!select) {
      return;
    }

    select.innerHTML = ['<option value="">-- Chọn category --</option>']
      .concat(
        state.categories.map(function (category) {
          return '<option value="' + category.id + '">' + category.name + "</option>";
        })
      )
      .join("");
  }

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
      tbody.innerHTML = '<tr><td colspan="6">Chưa có sản phẩm nào.</td></tr>';
      return;
    }

    tbody.innerHTML = state.products
      .map(function (product) {
        return [
          '<tr data-product-id="' + product.id + '">',
          "<td>" + product.name + "</td>",
          "<td>" + formatPrice(product.price) + "</td>",
          "<td>" + (product.categoryName || "Catalog") + "</td>",
          "<td>" + (product.isActive ? "Active" : "Hidden") + "</td>",
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
    state.products = await apiCall("/admin/products?includeInactive=true");
    renderProducts();
  }

  async function loadCategories() {
    state.categories = await apiCall("/admin/categories");
    renderCategoryOptions();
  }

  async function bootstrap() {
    if (!getToken()) {
      window.location.href = "../login.html";
      return;
    }

    try {
      await apiCall("/admin/health");
      setStatus("Admin API connected.");
      await Promise.all([loadCategories(), loadProducts()]);
    } catch (error) {
      setStatus(error.error || "Bạn không có quyền admin hoặc backend chưa sẵn sàng.", true);
    }
  }

  function bindForm() {
    var form = document.getElementById("productAdminForm");
    var cancel = document.getElementById("productCancel");

    if (cancel) {
      cancel.addEventListener("click", function () {
        resetForm();
        setStatus("Form đã được reset.");
      });
    }

    if (!form) {
      return;
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var categoryName = document.getElementById("categoryName").value.trim();
      var payload = {
        name: document.getElementById("pname").value.trim(),
        price: Number(document.getElementById("price").value || 0),
        stock: Number(document.getElementById("stock").value || 0),
        categoryId: document.getElementById("categoryId").value || "",
        categoryName: categoryName,
        description: document.getElementById("sdesc").value.trim(),
        imageUrl: document.getElementById("imageUrl").value.trim()
      };

      try {
        if (state.editingId) {
          await apiCall("/admin/products/" + encodeURIComponent(state.editingId), {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          setStatus("Đã cập nhật sản phẩm.");
        } else {
          await apiCall("/admin/products", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          setStatus("Đã thêm sản phẩm mới.");
        }

        resetForm();
        await Promise.all([loadCategories(), loadProducts()]);
      } catch (error) {
        setStatus(error.error || "Không thể lưu sản phẩm.", true);
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
        setStatus("Đang sửa sản phẩm: " + product.name);
        return;
      }

      try {
        if (action === "delete") {
          if (!window.confirm("Ẩn sản phẩm này khỏi storefront?")) {
            return;
          }

          await apiCall("/admin/products/" + encodeURIComponent(productId), {
            method: "DELETE"
          });
          setStatus("Đã ẩn sản phẩm.");
        }

        if (action === "restore") {
          await apiCall("/admin/products/" + encodeURIComponent(productId) + "/restore", {
            method: "POST"
          });
          setStatus("Đã khôi phục sản phẩm.");
        }

        await loadProducts();
      } catch (error) {
        setStatus(error.error || "Không thể cập nhật trạng thái sản phẩm.", true);
      }
    });
  }

  function bindLogout() {
    var link = document.getElementById("adminLogoutLink");
    if (!link) {
      return;
    }

    link.addEventListener("click", function (event) {
      event.preventDefault();
      window.localStorage.removeItem(TOKEN_KEY);
      window.location.href = "../login.html";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindForm();
    bindTableActions();
    bindLogout();
    bootstrap();
  });
})();
