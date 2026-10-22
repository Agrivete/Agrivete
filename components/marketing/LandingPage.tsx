'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AgrivetLogo, NavbarLogo } from '@/components/brand';
import { ThemeToggle } from '@/components/ui';

type Overlay = 'menu' | 'request' | null;

const services = [
  {
    group: 'Sales',
    title: 'Counter sales',
    description: 'Record completed sales and keep inventory changes connected to the transaction.',
  },
  {
    group: 'Stock',
    title: 'Inventory & adjustments',
    description: 'Review balances, low-stock thresholds, and the history behind each change.',
  },
  {
    group: 'Supply',
    title: 'Receiving & suppliers',
    description: 'Keep supplier records, incoming deliveries, and replenishment work in the same flow.',
  },
  {
    group: 'Lots',
    title: 'Expiry & reporting',
    description: 'Follow expiring lots and export sales, inventory, supplier, and owner-only profitability reports.',
  },
];

const menuLinks = [
  ['Home', '#home'],
  ['About', '#about'],
  ['System', '#works'],
  ['Workflows', '#services'],
  ['Questions', '#faq'],
] as const;

function InventoryPreview({ revealed }: { revealed: boolean }) {
  return (
    <div
      className="hero-product"
      data-ui
      id="stockroom-panel"
      aria-label="Illustrative sample inventory preview"
      hidden={!revealed}
    >
      <div className="product-head">
        <span>Product snapshot</span>
        <span className="sample-note">Sample items</span>
      </div>
      <div className="product-row">
        <strong>Layer Mash 50kg</strong>
        <span>Feeds</span>
        <small>Track on-hand stock and low-stock threshold</small>
      </div>
      <div className="product-row">
        <strong>Vitamin AD3E</strong>
        <span>Medicine</span>
        <small>Lot and expiry details stay with the product</small>
      </div>
      <div className="product-row">
        <strong>NPK 14-14-14 50kg</strong>
        <span>Fertilizer</span>
        <small>Review stock movement as it changes</small>
      </div>
    </div>
  );
}

function ProductScreen({
  title,
  note,
  rows,
  totalLabel,
  total,
  className,
}: {
  title: string;
  note: string;
  rows: [string, string, string][];
  totalLabel: string;
  total: string;
  className: string;
}) {
  return (
    <div className={`ui-window w-full h-auto min-h-0 ${className}`} data-ui aria-label={`Illustrative ${title.toLowerCase()} screen`}>
      <div className="ui-titlebar">
        <span>{title}</span>
        <span>{note}</span>
      </div>
      <div className="ui-body">
        {rows.map(([primary, secondary, status]) => (
          <div className="ui-line" key={primary}>
            <strong>{primary}</strong>
            <span>{secondary}</span>
            <span>{status}</span>
          </div>
        ))}
        <div className="ui-total">
          <span>{totalLabel}</span>
          <strong>{total}</strong>
        </div>
      </div>
    </div>
  );
}

function FeaturePanel({
  title,
  group,
  description,
  className,
  screen,
}: {
  title: string;
  group: string;
  description: string;
  className: string;
  screen: React.ReactNode;
}) {
  return (
    <article className={`work-item h-full flex flex-col justify-between ${className}`}>
      <div className="flex flex-col gap-2">
        <div className="work-item-head">
          <h3>{title}</h3>
          <span className="work-index">{group}</span>
        </div>
        <p>{description}</p>
      </div>
      {screen}
    </article>
  );
}

export default function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const requestCloseRef = useRef<HTMLButtonElement>(null);
  const requestNameRef = useRef<HTMLInputElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<Overlay>(null);
  const [stockroomRevealed, setStockroomRevealed] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [clock, setClock] = useState({ time: '', date: '' });

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    page.classList.add('js');
    page.querySelector('.site-header')?.classList.add('is-ready');

    const revealItems = [...page.querySelectorAll<HTMLElement>('.reveal')];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let revealObserver: IntersectionObserver | null = null;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
    } else {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              revealObserver?.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      );
      revealItems.forEach((item) => revealObserver?.observe(item));
    }

    const updateClock = () => {
      const now = new Date();
      setClock({
        time: new Intl.DateTimeFormat('en-PH', {
          timeZone: 'Asia/Manila',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }).format(now),
        date: new Intl.DateTimeFormat('en-PH', {
          timeZone: 'Asia/Manila',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(now),
      });
    };
    updateClock();
    const clockInterval = window.setInterval(updateClock, 60_000);

    return () => {
      window.clearInterval(clockInterval);
      revealObserver?.disconnect();
      page.classList.remove('js');
    };
  }, []);

  useEffect(() => {
    if (!activeOverlay) {
      lastFocusedRef.current?.focus();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTarget = activeOverlay === 'menu' ? menuCloseRef.current : requestNameRef.current;
    window.requestAnimationFrame(() => focusTarget?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveOverlay(null);
        return;
      }
      if (event.key !== 'Tab') return;

      const overlay = pageRef.current?.querySelector<HTMLElement>(
        activeOverlay === 'menu' ? '.nav-overlay' : '.request-overlay',
      );
      const focusable = overlay?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeOverlay]);

  function openOverlay(overlay: Exclude<Overlay, null>, trigger: HTMLElement) {
    lastFocusedRef.current =
      activeOverlay === 'menu' && overlay === 'request' ? menuButtonRef.current : trigger;
    setActiveOverlay(overlay);
  }

  function closeOverlay() {
    setActiveOverlay(null);
  }

  function handleNavClick(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault();
    closeOverlay();
    document.body.style.overflow = '';
    lastFocusedRef.current = null;

    setTimeout(() => {
      if (href === '#home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const id = href.replace('#', '');
        const target = document.getElementById(id);
        if (target) {
          const headerOffset = 90;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
          });
        }
      }
      window.history.pushState(null, '', href);
    }, 60);
  }

  function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestMessage(
      'Preview only: nothing was sent. Connect this form to a real contact endpoint before launch.',
    );
  }

  return (
    <div className="marketing-page" ref={pageRef}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="site-header is-ready">
        <div className="shell header-inner">
          <NavbarLogo href="#home" />

          <nav className="primary-nav hidden lg:flex" aria-label="Main navigation">
            <a href="#home" onClick={(e) => handleNavClick(e, '#home')}>Home</a>
            <a href="#about" onClick={(e) => handleNavClick(e, '#about')}>About</a>
            <a href="#works" onClick={(e) => handleNavClick(e, '#works')}>System</a>
            <a href="#services" onClick={(e) => handleNavClick(e, '#services')}>Workflows</a>
            <a href="#faq" onClick={(e) => handleNavClick(e, '#faq')}>Questions</a>
          </nav>

          <div className="header-actions">
            <div className="local-clock hidden lg:flex" aria-label="Philippine local time">
              <span>Philippines</span>
              <span className="clock-time">{clock.time || '10:30am'}</span>
              <span aria-hidden="true">·</span>
              <span>{clock.date || '14 October, 2026'}</span>
            </div>
            <ThemeToggle className="h-9 w-9 text-white/80 hover:bg-white/10 hover:text-white rounded-lg" />
            <button
              className="menu-button lg:hidden"
              type="button"
              aria-expanded={activeOverlay === 'menu'}
              aria-controls="nav-overlay"
              onClick={(event) => openOverlay('menu', event.currentTarget)}
              ref={menuButtonRef}
            >
              <span className="menu-icon" aria-hidden="true">
                <span />
                <span />
              </span>
              <span className="menu-word">Menu</span>
            </button>
            <Link
              className="button button--line hidden lg:inline-flex"
              href="/login"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="hero" id="home" aria-labelledby="hero-title">
          <div className="hero-inner">
            <div className="hero-copy">
              <h1 id="hero-title" className="reveal">
                Stock, in step.
              </h1>
              <p className="hero-lede reveal reveal-delay-1">
                A practical way to keep products, sales, suppliers, and expiry lots in view—even when
                the connection drops.
              </p>
              <div className="hero-actions reveal reveal-delay-2">
                <a className="button button--light" href="#works">
                  See how it works <span className="arrow" aria-hidden="true">→</span>
                </a>
                <Link className="button button--line" href="/login">
                  Sign in
                </Link>
              </div>
            </div>

            <div className="hero-visual reveal reveal-delay-1">
              <div className="hero-photo-wrap">
                <img
                  className="hero-photo"
                  src="/assets/hungduan-hapao-rice-terraces-flickr.jpg"
                  alt="Rice terraces in Hungduan, Hapao, Philippines"
                  fetchPriority="high"
                />
                <div className="photo-note">
                  <span>For the work behind every farm</span>
                  <button
                    className="reveal-photo-button"
                    type="button"
                    aria-pressed={stockroomRevealed}
                    aria-controls="stockroom-panel"
                    onClick={() => setStockroomRevealed((revealed) => !revealed)}
                  >
                    {stockroomRevealed ? 'Hide the stockroom' : 'Reveal the stockroom'}
                  </button>
                </div>
              </div>
              <InventoryPreview revealed={stockroomRevealed} />
            </div>

            <div className="hero-bottom">
              <span>Made for the daily run of an agri-vet shop</span>
              <a href="#about">
                Get to know Agrivet <span className="arrow" aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </section>

        <section className="about section-space" id="about" aria-labelledby="about-title">
          <div className="shell about-grid">
            <figure className="about-photo reveal">
              <img
                src="/assets/bags-of-grain.jpg"
                alt="Feed and grain sacks in a supply market"
                loading="lazy"
              />
              <figcaption className="photo-credit">
                “Bags of grain” by Charlie.Smatt · CC BY-SA 4.0 · Wikimedia Commons
              </figcaption>
            </figure>
            <div className="about-copy">
              <h2 className="section-title reveal" id="about-title">More than stock.</h2>
              <p className="section-copy reveal reveal-delay-1">
                Agrivet connects the everyday details behind an agricultural supply shop: the sale
                at the counter, the stock it changes, the supplier who replenishes it, and the lot
                that needs watching.
              </p>
              <p className="section-copy reveal reveal-delay-2">
                Instead of juggling separate notebooks for each, owners and teams can work from one
                shared record—with access shaped by each person&apos;s role.
              </p>
              <a className="about-link reveal reveal-delay-3" href="#services">
                Follow the stock loop <span className="arrow" aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        <section className="workflow-band" aria-label="Agrivet's shop workflow">
          <div className="shell">
            <p className="workflow-word reveal">Sell<span>.</span></p>
            <p className="workflow-word reveal reveal-delay-1">Count<span>.</span></p>
            <p className="workflow-word reveal reveal-delay-2">Receive<span>.</span></p>
            <p className="workflow-word reveal reveal-delay-3">Repeat<span>.</span></p>
          </div>
        </section>

        <section className="work-section section-space" id="works" aria-labelledby="works-title">
          <div className="shell">
            <div className="section-topline">
              <h2 className="section-title reveal" id="works-title">A clearer view of the day.</h2>
              <p className="section-copy reveal reveal-delay-1">
                The tools follow the way stock actually moves through a farm-supply shop, from
                counter sale to next delivery.
              </p>
            </div>

            <div className="work-grid items-stretch">
              <FeaturePanel
                className="reveal"
                title="Sales that update stock."
                group="Counter"
                description="Record a sale and let the inventory balance move with it. Cancelled sales restore stock through the same tracked flow."
                screen={
                  <ProductScreen
                    className="ui-window--sales"
                    title="New sale"
                    note="Sample checkout"
                    rows={[
                      ['Layer Mash 50kg', '1 bag', '₱1,450'],
                      ['Egg Tray (36 slots)', '2 pcs', '₱130'],
                    ]}
                    totalLabel="Example total"
                    total="₱1,580"
                  />
                }
              />
              <FeaturePanel
                className="reveal reveal-delay-1"
                title="Stock with a reason."
                group="Inventory"
                description="See on-hand quantities, low-stock thresholds, and movement history. Adjustments carry a reason and permission check."
                screen={
                  <ProductScreen
                    className="ui-window--stock"
                    title="Stock movement"
                    note="Recorded"
                    rows={[
                      ['Vitamin AD3E', 'Adjustment', 'Reason saved'],
                      ['Quantity change', '+ 6 bottles', 'Authorized'],
                    ]}
                    totalLabel="Movement record"
                    total="Updated"
                  />
                }
              />
              <FeaturePanel
                className="reveal"
                title="Lots with dates attached."
                group="Expiry"
                description="Keep lot and expiration details on receiving records, then review approaching dates in the expiring-stock view."
                screen={
                  <ProductScreen
                    className="ui-window--expiry"
                    title="Expiring lots"
                    note="Example rows"
                    rows={[
                      ['Vitamin AD3E', 'Lot VM-24', 'Review date'],
                      ['Foliar Booster 1L', 'Lot FB-08', 'Expiry tracked'],
                    ]}
                    totalLabel="Sort priority"
                    total="First to expire"
                  />
                }
              />
              <FeaturePanel
                className="reveal reveal-delay-1"
                title="Work that can catch up."
                group="Offline"
                description="Queue transactions on the device while offline. When service returns, Agrivet syncs them and checks local IDs to avoid duplicates."
                screen={
                  <ProductScreen
                    className="ui-window--sync"
                    title="Sync queue"
                    note="Connection restored"
                    rows={[
                      ['Local transaction', 'Saved on device', 'Ready'],
                      ['Duplicate check', 'Local ID', 'Matched'],
                    ]}
                    totalLabel="Sync status"
                    total="Up to date"
                  />
                }
              />
            </div>
          </div>
        </section>

        <section className="service-section section-space" id="services" aria-labelledby="services-title">
          <div className="shell">
            <div className="section-topline">
              <h2 className="section-title reveal" id="services-title">Built around the daily run.</h2>
              <p className="section-copy reveal reveal-delay-1">
                One practical system for the records a shop needs to move products responsibly and
                keep its team aligned.
              </p>
            </div>
            <div className="service-list">
              {services.map((service) => (
                <a className="service-row reveal" href="#works" key={service.group}>
                  <span className="service-index">{service.group}</span>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <span className="service-arrow" aria-hidden="true">→</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="system-section section-space" aria-labelledby="system-title">
          <div className="shell system-layout">
            <div className="system-copy">
              <h2 className="section-title reveal" id="system-title">The stock trail.</h2>
              <p className="section-copy reveal reveal-delay-1">
                A completed sale changes stock. A receiving record adds it. A permitted adjustment
                explains why it moved. Agrivet keeps those steps connected instead of scattering
                them across loose notes.
              </p>
              <ul className="system-steps">
                <li className="system-step reveal"><span aria-hidden="true">→</span><span>Movement history for stock changes</span></li>
                <li className="system-step reveal reveal-delay-1"><span aria-hidden="true">→</span><span>Lot and expiry details with receiving</span></li>
                <li className="system-step reveal reveal-delay-2"><span aria-hidden="true">→</span><span>Role-based access for shop teams</span></li>
                <li className="system-step reveal reveal-delay-3"><span aria-hidden="true">→</span><span>Offline transactions queued for sync</span></li>
              </ul>
            </div>

            <div className="system-board reveal" data-ui aria-label="Illustrative stock movement ledger">
              <div className="system-record">
                <h3>One stock record.</h3>
                <div className="movement">
                  <strong>Sale recorded</strong><em>Stock reduced</em>
                  <small>Layer Mash 50kg · inventory movement saved</small>
                </div>
                <div className="movement">
                  <strong>Delivery received</strong><em>Stock increased</em>
                  <small>Supplier and receiving details kept together</small>
                </div>
                <div className="movement">
                  <strong>Lot entered</strong><em>Expiry watched</em>
                  <small>Expiration date follows the received product</small>
                </div>
              </div>
              <figure className="system-photo">
                <img
                  src="/assets/chickens-in-poultry-farm.jpg"
                  alt="Poultry served by local agricultural supply shops"
                  loading="lazy"
                />
              </figure>
            </div>
          </div>
        </section>

        <section className="faq-section section-space" id="faq" aria-labelledby="faq-title">
          <div className="shell faq-layout">
            <div>
              <h2 className="section-title reveal" id="faq-title">Questions, answered.</h2>
              <p className="section-copy faq-heading-copy reveal reveal-delay-1">
                How the current Agrivet system handles everyday shop work.
              </p>
            </div>
            <div className="faq-list">
              <details className="faq-item reveal">
                <summary>Can the team record work without internet?</summary>
                <p>Sales and other supported transactions can be queued locally while offline. When the connection returns, the sync flow checks each local ID before processing it.</p>
              </details>
              <details className="faq-item reveal">
                <summary>Does a sale update the stock balance?</summary>
                <p>Yes. A completed sale deducts inventory, and cancelling a sale restores it. Stock adjustments require an allowed role and a reason.</p>
              </details>
              <details className="faq-item reveal">
                <summary>Can every team member see the same reports?</summary>
                <p>Access is role-based. For example, profitability data is restricted to the owner, while report viewing and exports are available to authorized roles.</p>
              </details>
              <details className="faq-item reveal">
                <summary>Does the system track product expiry?</summary>
                <p>Receiving records can include lot and expiry details. Expiration alerts collect approaching lots so the team can review them.</p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer" id="contact">
        <div className="shell">
          <div className="footer-main">
            <h2 className="reveal">Keep the shop moving.</h2>
            <div className="footer-action reveal reveal-delay-1">
              <p>See whether Agrivet fits the way your team sells, receives, and tracks stock.</p>
              <button
                className="button button--light"
                type="button"
                onClick={(event) => openOverlay('request', event.currentTarget)}
              >
                Request a walkthrough <span className="arrow" aria-hidden="true">→</span>
              </button>
            </div>
          </div>
          <div className="footer-links">
            <div>
              <h3>Agrivet</h3>
              <ul>
                <li><a href="#about">How it fits</a></li>
                <li><a href="#works">System</a></li>
                <li><a href="#services">Workflows</a></li>
              </ul>
            </div>
            <div>
              <h3>Shop access</h3>
              <ul>
                <li><Link href="/login">Sign in</Link></li>
                <li>
                  <button
                    type="button"
                    className="header-contact"
                    onClick={(event) => openOverlay('request', event.currentTarget)}
                  >
                    Ask for a walkthrough
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h3>Image credits</h3>
              <p>
                <a href="https://commons.wikimedia.org/w/index.php?curid=94029854" target="_blank" rel="noreferrer">
                  “Hungduan, Hapao rice terraces - Flickr” by Arian Zwegers, CC BY 2.0, via Wikimedia Commons.
                </a>
              </p>
              <p className="footer-credit">
                <a href="https://commons.wikimedia.org/wiki/File:Bags_of_grain.jpg" target="_blank" rel="noreferrer">
                  “Bags of grain” by Charlie.Smatt, CC BY-SA 4.0, via Wikimedia Commons.
                </a>
              </p>
              <p className="footer-credit">
                <a href="https://commons.wikimedia.org/wiki/File:Chickens_in_poultry_farm.jpg" target="_blank" rel="noreferrer">
                  “Chickens in poultry farm” by Tiger Gang, CC BY-SA 4.0, via Wikimedia Commons.
                </a>
              </p>
            </div>
          </div>
          <div className="flex justify-center py-10">
            <AgrivetLogo size="lg" variant="light" href="#home" />
          </div>
          <div className="footer-bottom">
            <span>Agrivet · Sales, inventory, and supplier management</span>
            <span>Illustrative product data is marked as sample.</span>
          </div>
        </div>
      </footer>

      <div
        className={`nav-overlay${activeOverlay === 'menu' ? ' is-open' : ''}`}
        id="nav-overlay"
        aria-hidden={activeOverlay !== 'menu'}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeOverlay();
        }}
      >
        <div className="overlay-top" style={{ justifyContent: 'space-between' }}>
          <div className="flex items-center gap-2">
            <ThemeToggle
              className="h-9 w-9 text-white/80 hover:bg-white/10 hover:text-white rounded-lg"
              showLabel={true}
              labelClassName="text-xs font-medium text-white/80"
            />
          </div>
          <button
            className="overlay-close"
            type="button"
            aria-label="Close menu"
            onClick={closeOverlay}
            ref={menuCloseRef}
          >
            ×
          </button>
        </div>
        <nav className="nav-links" aria-label="Expanded navigation">
          {menuLinks.map(([label, href]) => (
            <a href={href} key={href} onClick={(e) => handleNavClick(e, href)}>
              {label}
            </a>
          ))}
          <Link href="/login" onClick={closeOverlay} className="sign-in-link">Sign in</Link>
        </nav>
      </div>

      <div
        className={`request-overlay${activeOverlay === 'request' ? ' is-open' : ''}`}
        aria-hidden={activeOverlay !== 'request'}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeOverlay();
        }}
      >
        <section
          className="request-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-title"
          aria-describedby="request-description"
        >
          <button
            className="overlay-close request-close"
            type="button"
            aria-label="Close request form"
            onClick={closeOverlay}
            ref={requestCloseRef}
          >
            ×
          </button>
          <h2 id="request-title">Let&apos;s talk Agrivet.</h2>
          <p id="request-description">
            Share a little about your shop and what you&apos;d like to see. This preview form is not
            connected to a contact service yet.
          </p>
          <form className="request-form" onSubmit={handleRequestSubmit}>
            <div className="field">
              <label htmlFor="request-name">Your name</label>
              <input id="request-name" name="name" autoComplete="name" required ref={requestNameRef} />
            </div>
            <div className="field">
              <label htmlFor="request-email">Email address</label>
              <input id="request-email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="request-focus">What would you like to explore?</label>
              <select id="request-focus" name="focus" defaultValue="Sales and inventory">
                <option>Sales and inventory</option>
                <option>Expiry tracking</option>
                <option>Suppliers and receiving</option>
                <option>Offline sync</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="request-message">Anything else?</label>
              <textarea id="request-message" name="message" />
            </div>
            <button className="button button--dark" type="submit">
              Prepare request <span className="arrow" aria-hidden="true">→</span>
            </button>
            <p className="form-note" role="status" aria-live="polite">{requestMessage}</p>
          </form>
        </section>
      </div>
    </div>
  );
}
