import { useGame } from '../store'
import { useBuild } from '../game/build/buildStore'
import { CATALOG } from '../game/build/catalog'
import type { Category } from '../game/build/itemTypes'
import { useUI, TABS } from './uiStore'

const CATEGORY_LABEL: Record<Category, string> = {
  nature: 'しぜん',
  building: 'たてもの',
  fun: 'おもちゃ',
}

function ShopPanel() {
  const coins = useGame((s) => s.coins)
  const buy = useBuild((s) => s.buy)
  const close = useBuild((s) => s.closePanel)
  const inventory = useBuild((s) => s.inventory)
  const shopTab = useUI((s) => s.shopTab)

  // 上タブが選ばれていればそのカテゴリだけ・なければ全カテゴリ（おみせボタン経由）
  const cats: Category[] = shopTab ? [shopTab] : ['nature', 'building', 'fun']
  const tab = shopTab ? TABS.find((t) => t.key === shopTab) : null
  const title = tab ? `${tab.emoji} ${tab.label}` : '🏪 おみせ'

  return (
    <div className="panel-overlay" data-testid="shop-panel">
      <div className="panel">
        <div className="panel-head">
          <h2>{title}</h2>
          <div className="coin-pill">
            <span className="coin-icon" /> {coins}
          </div>
          <button className="panel-close" onClick={close} aria-label="とじる">
            ✖
          </button>
        </div>
        <div className="panel-body">
          {cats.map((cat) => (
            <div key={cat} className="shop-cat">
              <h3>{CATEGORY_LABEL[cat]}</h3>
              <div className="shop-grid">
                {CATALOG.filter((i) => i.category === cat).map((item) => {
                  const owned = inventory[item.id] ?? 0
                  const afford = coins >= item.price
                  return (
                    <div className="item-card" key={item.id}>
                      <div className="item-emoji">{item.emoji}</div>
                      <div className="item-name">{item.name}</div>
                      <button
                        className="buy-btn"
                        disabled={!afford}
                        data-testid={`buy-${item.id}`}
                        onClick={() => buy(item.id)}
                      >
                        <span className="coin-icon small" /> {item.price}
                      </button>
                      {owned > 0 && <div className="owned-badge">×{owned}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InventoryPanel() {
  const inventory = useBuild((s) => s.inventory)
  const select = useBuild((s) => s.selectForPlace)
  const close = useBuild((s) => s.closePanel)

  const owned = CATALOG.filter((i) => (inventory[i.id] ?? 0) > 0)

  return (
    <div className="panel-overlay" data-testid="inventory-panel">
      <div className="panel">
        <div className="panel-head">
          <h2>🎒 マイアイテム</h2>
          <button className="panel-close" onClick={close} aria-label="とじる">
            ✖
          </button>
        </div>
        <div className="panel-body">
          {owned.length === 0 ? (
            <p className="empty">まだ なにも ないよ。{'\n'}おみせで かおう！</p>
          ) : (
            <div className="shop-grid">
              {owned.map((item) => (
                <button
                  className="item-card pick"
                  key={item.id}
                  data-testid={`pick-${item.id}`}
                  onClick={() => select(item.id)}
                >
                  <div className="item-emoji">{item.emoji}</div>
                  <div className="item-name">{item.name}</div>
                  <div className="owned-badge">×{inventory[item.id]}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Toolbar() {
  const openShop = useBuild((s) => s.openShop)
  const setShopTab = useUI((s) => s.setShopTab)
  const openInventory = useBuild((s) => s.openInventory)
  const startMove = useBuild((s) => s.startMoveMode)
  const startTrash = useBuild((s) => s.startTrashMode)
  const undo = useBuild((s) => s.undo)
  const moveArmed = useBuild((s) => s.moveArmed)
  const trashArmed = useBuild((s) => s.trashArmed)
  const canUndo = useBuild((s) => s.history.length > 0)

  return (
    <div className="toolbar">
      <button
        className="tool-btn"
        data-testid="open-shop"
        onClick={() => {
          setShopTab(null) // 「おみせ」は全カテゴリ表示（タブ絞り込みを解除）
          openShop()
        }}
      >
        🏪<span>おみせ</span>
      </button>
      <button className="tool-btn" data-testid="open-inventory" onClick={openInventory}>
        🎒<span>マイアイテム</span>
      </button>
      <button
        className={`tool-btn ${moveArmed ? 'active' : ''}`}
        data-testid="move-tool"
        onClick={startMove}
      >
        ✋<span>うごかす</span>
      </button>
      <button
        className={`tool-btn ${trashArmed ? 'active danger' : ''}`}
        data-testid="trash-tool"
        onClick={startTrash}
      >
        🗑️<span>けす</span>
      </button>
      <button className="tool-btn" data-testid="undo" onClick={undo} disabled={!canUndo}>
        ↩️<span>もどす</span>
      </button>
    </div>
  )
}

function PlacingBanner() {
  const mode = useBuild((s) => s.mode)
  const moveArmed = useBuild((s) => s.moveArmed)
  const trashArmed = useBuild((s) => s.trashArmed)
  const cancel = useBuild((s) => s.cancel)
  const rotate = useBuild((s) => s.rotate)

  if (mode === 'placing' || mode === 'moving') {
    return (
      <div className="placing-banner" data-testid="placing-banner">
        <span>{mode === 'moving' ? '🚚 うごかす' : '👇 おきたいところを クリック！'}</span>
        <button className="rotate-btn" data-testid="rotate-btn" onClick={rotate}>
          🔄 まわす
        </button>
        <button className="cancel-btn" data-testid="cancel-place" onClick={cancel}>
          ✖ やめる
        </button>
      </div>
    )
  }
  if (moveArmed) {
    return (
      <div className="placing-banner" data-testid="move-banner">
        <span>✋ うごかしたい アイテムを クリック！</span>
        <button className="cancel-btn" data-testid="cancel-move" onClick={cancel}>
          ✖ やめる
        </button>
      </div>
    )
  }
  if (trashArmed) {
    return (
      <div className="placing-banner danger" data-testid="trash-banner">
        <span>🗑️ けしたい ものを クリック！</span>
        <button className="cancel-btn" data-testid="cancel-trash" onClick={cancel}>
          ✖ やめる
        </button>
      </div>
    )
  }
  return null
}

export function BuildUI() {
  const panel = useBuild((s) => s.panel)
  return (
    <>
      <Toolbar />
      <PlacingBanner />
      {panel === 'shop' && <ShopPanel />}
      {panel === 'inventory' && <InventoryPanel />}
    </>
  )
}
