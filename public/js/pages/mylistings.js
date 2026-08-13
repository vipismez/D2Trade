/**
 * D2Trade — 我的发布页
 */

const MyListingsPage = {
  render() {
    return `
      <div class="d2-flex-between d2-mb-2">
        <h2 class="d2-title" style="margin-bottom:0;text-align:left;">我的货物</h2>
        <button class="d2-btn" onclick="App.route('market')">← 返回市场</button>
      </div>

      <div class="d2-panel d2-mylistings-form d2-mb-3">
        <h3 style="color:var(--d2-gold);margin-bottom:0.75rem;">发布新装备</h3>
        <form id="new-listing-form">
          <div class="d2-form-group">
            <label class="d2-label">装备名称</label>
            <div class="d2-name-row">
              <input class="d2-input" name="item_name" id="item-name" placeholder="例：末日 狂战士斧" required />
              <button type="button" class="d2-btn" id="pick-equipment">📖 从装备库选择</button>
            </div>
          </div>
          <div class="d2-form-group">
            <label class="d2-ethereal-label">
              <input type="checkbox" id="item-ethereal" />
              <span>无形物品（防御/伤害 +50%，无法修复）</span>
            </label>
          </div>
          <div class="d2-form-group">
            <label class="d2-label">装备属性（选填）</label>
            <textarea class="d2-textarea" name="item_attrs" placeholder="例：ED 380%、IAS 60%、+3 技能"></textarea>
          </div>
          <div class="d2-form-group">
            <label class="d2-label">装备截图（选填，≤5MB）</label>
            <input class="d2-input" type="file" id="item-image" accept="image/jpeg,image/png,image/webp,image/gif" />
            <div id="image-preview" class="d2-image-preview" style="display:none;">
              <img id="image-preview-img" alt="装备截图预览" />
              <button type="button" class="d2-btn d2-btn-sm d2-btn-danger" id="image-remove">移除</button>
            </div>
          </div>
          <div class="d2-form-row">
            <div class="d2-form-group" style="flex:2;">
              <label class="d2-label">价格（积分，总价）</label>
              <input class="d2-input" name="price" type="number" min="1" placeholder="例：100" required />
            </div>
            <div class="d2-form-group" style="flex:1;">
              <label class="d2-label">数量</label>
              <input class="d2-input" name="quantity" type="number" min="1" value="1" required />
            </div>
          </div>
          <button type="submit" class="d2-btn" id="submit-listing">发布装备</button>
        </form>
      </div>

      <!-- 装备选择模态框 -->
      <div class="d2-modal" id="equipment-modal" style="display:none;">
        <div class="d2-modal-box">
          <div class="d2-modal-header">
            <span class="d2-title" style="margin:0;font-size:1.1rem;">📖 选择装备</span>
            <button type="button" class="d2-modal-close" id="equipment-modal-close">✕</button>
          </div>
          <div class="d2-modal-filters">
            <select class="d2-input" id="eq-quality"></select>
            <select class="d2-input" id="eq-category"></select>
            <select class="d2-input" id="eq-type"></select>
            <select class="d2-input" id="eq-tier"></select>
            <input class="d2-input" id="eq-search" placeholder="搜索装备名称..." />
          </div>
          <div class="d2-modal-grid" id="eq-list">
            <div class="text-dim" style="grid-column:1/-1;text-align:center;padding:2rem;">加载中...</div>
          </div>
        </div>
      </div>

      <!-- 编辑装备弹窗 -->
      <div class="d2-modal" id="edit-modal" style="display:none;">
        <div class="d2-modal-box">
          <div class="d2-modal-header">
            <span class="d2-title" style="margin:0;font-size:1.1rem;">✏️ 编辑装备</span>
            <button type="button" class="d2-modal-close" id="edit-modal-close">✕</button>
          </div>
          <form id="edit-form">
            <input type="hidden" id="edit-id" />
            <div class="d2-form-group">
              <label class="d2-label">装备名称</label>
              <input class="d2-input" id="edit-name" required />
            </div>
            <div class="d2-form-group">
              <label class="d2-label">装备属性（选填）</label>
              <textarea class="d2-textarea" id="edit-attrs"></textarea>
            </div>
            <div class="d2-form-row">
              <div class="d2-form-group" style="flex:2;">
                <label class="d2-label">价格（积分，总价）</label>
                <input class="d2-input" id="edit-price" type="number" min="1" required />
              </div>
              <div class="d2-form-group" style="flex:1;">
                <label class="d2-label">数量</label>
                <input class="d2-input" id="edit-quantity" type="number" min="1" required />
              </div>
            </div>
            <button type="submit" class="d2-btn d2-btn-gold">保存修改</button>
          </form>
        </div>
      </div>

      <div id="mylistings-list">
        <div class="text-dim" style="text-align:center;padding:2rem;">加载中...</div>
      </div>`
  },

  async mount() {
    if (!Auth.loggedIn) { App.route('login'); return }

    // ── 无形物品开关 ──
    const etherealBox = $('#item-ethereal')
    etherealBox.onchange = () => {
      const nameInput = $('#item-name')
      let name = nameInput.value.trim()
      if (!name) return
      if (etherealBox.checked) {
        // 勾选：加前缀
        if (!name.startsWith('无形')) nameInput.value = '无形-' + name
      } else {
        // 取消：去前缀
        nameInput.value = name.replace(/^无形-/, '')
      }
    }

    // ── 装备选择器 ──
    const modal = $('#equipment-modal')
    const eqList = $('#eq-list')
    const qualitySel = $('#eq-quality')
    const catSel = $('#eq-category')
    const typeSel = $('#eq-type')
    const tierSel = $('#eq-tier')
    const eqSearch = $('#eq-search')

    $('#pick-equipment').onclick = async () => {
      modal.style.display = ''
      if (!this._equipment) {
        eqList.innerHTML = '<div class="text-dim" style="grid-column:1/-1;text-align:center;padding:2rem;">加载中...</div>'
        const res = await API.equipment()
        if (res.success) {
          this._equipment = res.data
          this._initEquipmentFilters()
        } else {
          eqList.innerHTML = `<div class="text-red" style="grid-column:1/-1;">${esc(res.error)}</div>`
          return
        }
      }
      this._renderEquipmentList()
    }

    $('#equipment-modal-close').onclick = () => { modal.style.display = 'none' }
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none' }

    qualitySel.onchange = () => { this._updateCategoryFilter(); this._updateTypeFilter(); this._renderEquipmentList() }
    catSel.onchange = () => { this._updateTypeFilter(); this._renderEquipmentList() }
    typeSel.onchange = () => this._renderEquipmentList()
    tierSel.onchange = () => this._renderEquipmentList()
    eqSearch.oninput = () => this._renderEquipmentList()

    this._imageBase64 = null
    this._equipmentImage = null
    const fileInput = $('#item-image')
    const preview = $('#image-preview')
    const previewImg = $('#image-preview-img')

    // 图片选择预览（手动上传截图）
    fileInput.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      if (file.size > 5 * 1024 * 1024) {
        toast('图片不能超过 5MB', 'error')
        fileInput.value = ''
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        this._imageBase64 = reader.result
        this._equipmentImage = null
        previewImg.src = reader.result
        preview.style.display = ''
      }
      reader.readAsDataURL(file)
    }

    // 移除图片
    $('#image-remove').onclick = () => {
      this._imageBase64 = null
      this._equipmentImage = null
      fileInput.value = ''
      preview.style.display = 'none'
      previewImg.src = ''
    }

    $('#new-listing-form').onsubmit = async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const submitBtn = $('#submit-listing')

      let imageUrl = undefined
      // 优先手动上传截图，其次装备库基础图标
      if (this._imageBase64) {
        submitBtn.textContent = '上传图片中...'
        submitBtn.disabled = true
        const file = fileInput.files[0]
        const upRes = await API.uploadImage(file?.name || 'image.jpg', this._imageBase64)
        if (!upRes.success) {
          toast(upRes.error, 'error')
          submitBtn.textContent = '发布装备'
          submitBtn.disabled = false
          return
        }
        imageUrl = upRes.url
      }

      const data = {
        item_name: fd.get('item_name'),
        item_attrs: fd.get('item_attrs') || '{}',
        price: parseInt(fd.get('price')),
        quantity: parseInt(fd.get('quantity')) || 1,
      }
      // 优先手动截图，其次装备库基础图标
      if (imageUrl) {
        data.image_url = imageUrl
      } else if (this._equipmentImage) {
        data.image_url = this._equipmentImage
      }

      const res = await API.createListing(data)
      submitBtn.textContent = '发布装备'
      submitBtn.disabled = false

      if (res.success) {
        toast('发布成功！', 'success')
        e.target.reset()
        this._imageBase64 = null
        this._equipmentImage = null
        preview.style.display = 'none'
        previewImg.src = ''
        this._load()
      } else {
        toast(res.error, 'error')
      }
    }

    // ── 编辑弹窗 ──
    const editModal = $('#edit-modal')
    $('#edit-modal-close').onclick = () => { editModal.style.display = 'none' }
    editModal.onclick = (e) => { if (e.target === editModal) editModal.style.display = 'none' }
    $('#edit-form').onsubmit = async (e) => {
      e.preventDefault()
      const id = parseInt($('#edit-id').value)
      const data = {
        item_name: $('#edit-name').value.trim(),
        item_attrs: $('#edit-attrs').value || '{}',
        price: parseInt($('#edit-price').value),
        quantity: parseInt($('#edit-quantity').value) || 1,
      }
      if (!data.item_name || !data.price) { toast('名称和价格为必填项', 'error'); return }

      const res = await API.updateListing(id, data)
      if (res.success) {
        toast('已保存修改', 'success')
        editModal.style.display = 'none'
        this._load()
      } else {
        toast(res.error, 'error')
      }
    }

    await this._load()
  },

  _initEquipmentFilters() {
    // 完整品质分类（12 类，分组 + 颜色标注）
    const QUALITY_GROUPS = [
      { label: '白装底材', values: ['破碎', '普通', '超强'] },
      { label: '魔法品质', values: ['魔法', '套装', '稀有', '独有', '橙色'] },
      { label: '材料', values: ['符文', '符文之语', '宝石'] },
    ]
    const QUALITY_DISPLAY = {
      '破碎': '破碎（白色）',
      '普通': '普通（白色）',
      '超强': '超强（白色）',
      '魔法': '魔法（蓝色）',
      '套装': '套装（绿色）',
      '稀有': '稀有（黄色）',
      '独有': '独有（暗金）',
      '橙色': '合成装备（橙色）',
      '符文': '符文',
      '符文之语': '符文之语',
      '宝石': '宝石',
    }
    let html = '<option value="">全部品质</option>'
    for (const g of QUALITY_GROUPS) {
      html += `<optgroup label="${esc(g.label)}">`
      for (const q of g.values) {
        html += `<option value="${esc(q)}">${esc(QUALITY_DISPLAY[q] || q)}</option>`
      }
      html += '</optgroup>'
    }
    $('#eq-quality').innerHTML = html
    const tiers = [...new Set(this._equipment.map(e => e.tier))]
    $('#eq-tier').innerHTML = '<option value="">全部等级</option>' +
      tiers.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')
    this._updateCategoryFilter()
    this._updateTypeFilter()
  },

  /** 破碎/超强是白装底材的品质变体，筛选时映射到"普通"底材 */
  _qualityFilter() {
    const q = $('#eq-quality').value
    return (q === '破碎' || q === '超强') ? '普通' : q
  },

  _updateCategoryFilter() {
    const quality = this._qualityFilter()
    const cats = [...new Set(this._equipment.filter(e => !quality || e.quality === quality).map(e => e.category))]
    $('#eq-category').innerHTML = '<option value="">全部分类</option>' +
      cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')
  },

  _updateTypeFilter() {
    const quality = this._qualityFilter()
    const cat = $('#eq-category').value
    const types = [...new Set(this._equipment
      .filter(e => (!quality || e.quality === quality) && (!cat || e.category === cat))
      .map(e => e.type))]
    $('#eq-type').innerHTML = '<option value="">全部类型</option>' +
      types.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')
  },

  _renderEquipmentList() {
    const eqList = $('#eq-list')
    const quality = this._qualityFilter()
    const cat = $('#eq-category').value
    const type = $('#eq-type').value
    const tier = $('#eq-tier').value
    const search = $('#eq-search').value.trim().toLowerCase()

    let items = this._equipment.filter(e =>
      (!quality || e.quality === quality) &&
      (!cat || e.category === cat) &&
      (!type || e.type === type) &&
      (!tier || e.tier === tier) &&
      (!search || e.name.toLowerCase().includes(search) || (e.name_en || '').toLowerCase().includes(search))
    )

    if (items.length > 100) items = items.slice(0, 100)
    this._filteredItems = items

    if (items.length === 0) {
      const RANDOM_QUALITY = ['魔法', '稀有']
      const msg = RANDOM_QUALITY.includes($('#eq-quality').value)
        ? '该品质装备为随机生成，无固定列表，请手动输入装备名称'
        : '无匹配装备'
      eqList.innerHTML = `<div class="text-dim" style="grid-column:1/-1;text-align:center;padding:2rem;">${esc(msg)}</div>`
      return
    }

    eqList.innerHTML = items.map((e, i) => `
      <div class="d2-eq-item" onclick="MyListingsPage._selectEquipment(${i})">
        ${e.image ? `<img src="${esc(e.image)}" alt="${esc(e.name)}" loading="lazy" />` : ''}
        <div class="d2-eq-name">${esc(e.name)}</div>
        <div class="d2-eq-meta">${esc(e.quality)} · ${esc(e.type)}</div>
      </div>
    `).join('')
  },

  /** 生成完整装备名称: [无形-]品质-分类-类型-等级-名称 */
  _buildFullName(item) {
    const parts = []
    const ethereal = $('#item-ethereal')
    if (ethereal && ethereal.checked) parts.push('无形')
    // 品质优先用下拉选中值（破碎/超强/普通等），否则用 item.quality
    const selQuality = $('#eq-quality')?.value
    if (selQuality) {
      parts.push(selQuality)
    } else if (item.quality) {
      parts.push(item.quality)
    }
    // 分类在等于品质、"其他"、"饰品"时跳过（冗余/归类前缀）
    if (item.category && item.category !== item.quality && item.category !== '其他' && item.category !== '饰品') parts.push(item.category)
    // 类型在等于分类时跳过
    if (item.type && item.type !== item.category) parts.push(item.type)
    // 等级加"级"后缀，区分品质"普通"与底材等级"普通"
    if (item.tier && item.tier !== '未分级') parts.push(item.tier + '级')
    parts.push(item.name)
    return parts.join('-')
  },

  _selectEquipment(index) {
    const item = this._filteredItems[index]
    if (!item) return

    // 填入完整名称（品质-分类-类型-等级-名称）
    $('#item-name').value = this._buildFullName(item)

    // 填入详细属性描述（基础属性 + 特殊属性）
    const attrLines = []
    if (item.attributes && Object.keys(item.attributes).length > 0) {
      Object.entries(item.attributes)
        .filter(([, v]) => v && v !== '-')
        .forEach(([k, v]) => attrLines.push(`${k}: ${v}`))
    }
    if (item.special_attrs && item.special_attrs.length > 0) {
      if (attrLines.length > 0) attrLines.push('')
      item.special_attrs.forEach(line => attrLines.push(line))
    }
    const attrInput = document.querySelector('#new-listing-form textarea[name="item_attrs"]')
    if (attrInput) attrInput.value = attrLines.join('\n')

    // 设置装备图片
    if (item.image) {
      this._equipmentImage = item.image
      this._imageBase64 = null
      $('#item-image').value = ''
      const preview = $('#image-preview')
      const previewImg = $('#image-preview-img')
      previewImg.src = item.image
      preview.style.display = ''
    }

    $('#equipment-modal').style.display = 'none'
    toast(`已选择: ${item.name} (${item.quality})`, 'success')
  },

  async _load() {
    const el = $('#mylistings-list')
    const res = await API.myListings()
    if (!res.success) { el.innerHTML = `<div class="text-red">${esc(res.error)}</div>`; return }

    this._myItems = res.data

    if (res.data.length === 0) {
      el.innerHTML = '<div class="text-dim" style="text-align:center;padding:2rem;">暂无货物</div>'
      return
    }

    el.innerHTML = `
      <table class="d2-table">
        <thead>
          <tr><th>装备</th><th>属性</th><th>数量</th><th>价格</th><th>状态</th><th>时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          ${res.data.map(item => `
            <tr>
              <td><span class="d2-item-name" style="font-size:0.9rem;">${esc(item.item_name)}</span></td>
              <td style="font-size:0.8rem;color:var(--d2-blue);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(item.item_attrs === '{}' ? '' : item.item_attrs)}">${esc(item.item_attrs === '{}' ? '-' : item.item_attrs)}</td>
              <td style="text-align:center;">x${item.quantity ?? 1}</td>
              <td class="text-gold">${item.price} 积分</td>
              <td>${item.status === 'active' ? '<span class="d2-badge d2-badge-green">在售</span>' :
                    item.status === 'sold' ? '<span class="d2-badge d2-badge-gold">已售</span>' :
                    '<span class="d2-badge d2-badge-red">已下架</span>'}</td>
              <td style="font-size:0.8rem;">${fmtTime(item.created_at)}</td>
              <td style="white-space:nowrap;">
                ${item.status === 'active'
                  ? `<button class="d2-btn d2-btn-sm" onclick="MyListingsPage._edit(${item.id})">编辑</button>
                     <button class="d2-btn d2-btn-sm d2-btn-danger" onclick="MyListingsPage._remove(${item.id})">删除</button>`
                  : `<button class="d2-btn d2-btn-sm d2-btn-danger" onclick="MyListingsPage._remove(${item.id})">删除</button>`}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
  },

  /** 打开编辑弹窗 */
  _edit(id) {
    const item = this._myItems?.find(i => i.id === id)
    if (!item) return
    $('#edit-id').value = item.id
    $('#edit-name').value = item.item_name
    $('#edit-attrs').value = item.item_attrs === '{}' ? '' : item.item_attrs
    $('#edit-price').value = item.price
    $('#edit-quantity').value = item.quantity ?? 1
    $('#edit-modal').style.display = ''
  },

  /** 删除帖子 */
  _remove(id) {
    d2Confirm('确认删除该帖子？\n此操作不可恢复。', async () => {
      const res = await API.cancelListing(id)
      if (res.success) { toast('已删除', 'success'); this._load() }
      else { toast(res.error, 'error') }
    }, true)
  },
}
