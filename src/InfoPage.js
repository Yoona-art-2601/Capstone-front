import { PageShell, useShopSettings } from './Layout';

function rm(value) {
  return 'RM ' + Number(value).toFixed(2);
}

function AboutUs() {
  return (
    <>
      <h1 className="page-title">About us</h1>
      <p className="page-lead">Healthy food, from our farm and trusted partners to your table.</p>
      <div className="info-card">
        <p>
          Beacon Mart is a healthy mart chain serving families across Kuala Lumpur and Selangor. We focus on
          natural, minimally processed food so that eating well is simple and affordable every day.
        </p>
        <h2>Beacon Chicken</h2>
        <p>
          Our signature Beacon Chicken is raised on our own farms with a natural feed that includes seaweed,
          moringa, fruit enzymes and probiotics. It is the base of our fresh chicken range and our Ready to Cook
          products such as marinated wingettes, nuggets and cocktail sausages.
        </p>
        <h2>What we offer</h2>
        <ul>
          <li>Fresh Beacon Chicken and Ready to Cook meals</li>
          <li>Wild-caught Sabah seafood, frozen for freshness</li>
          <li>Health &amp; wellness products such as Manuka honey, chicken essence and bird nest</li>
          <li>Organic pantry items and healthier beverages</li>
        </ul>
        <h2>Shop your way</h2>
        <p>
          Visit any of our outlets, or order online from the branch nearest to you. Stock is managed per branch,
          so what you see online is what that branch has available.
        </p>
      </div>
    </>
  );
}

function ContactUs({ settings }) {
  const wa = settings && settings.whatsapp_number;
  return (
    <>
      <h1 className="page-title">Contact us</h1>
      <p className="page-lead">We are happy to help with orders, products and deliveries.</p>
      <div className="contact-grid">
        <div className="info-card">
          <h2>WhatsApp</h2>
          <p>The fastest way to reach our customer service team.</p>
          {wa && (
            <a className="button button-accent" href={'https://wa.me/' + wa} target="_blank" rel="noopener noreferrer">
              Chat on WhatsApp
            </a>
          )}
        </div>
        <div className="info-card">
          <h2>Visit a store</h2>
          <p>Find the address, opening hours and phone number of each outlet.</p>
          <a className="text-link" href="/stores">Where to find us</a>
        </div>
        <div className="info-card">
          <h2>Order enquiries</h2>
          <p>Logged in customers can check the status of every order in My Orders. Please quote your order number when contacting us.</p>
          <a className="text-link" href="/my-orders">My orders</a>
        </div>
      </div>
    </>
  );
}

function DeliveryPolicy({ settings }) {
  return (
    <>
      <h1 className="page-title">Delivery policy</h1>
      <div className="info-card">
        <h2>Delivery charges</h2>
        {settings ? (
          <ul>
            <li>FREE delivery for orders of {rm(settings.free_delivery_threshold)} and above.</li>
            <li>A flat delivery fee of {rm(settings.delivery_fee)} applies to orders below {rm(settings.free_delivery_threshold)}.</li>
          </ul>
        ) : <p>Loading...</p>}
        <h2>Fulfilment</h2>
        <p>
          Each order is prepared by the branch you selected at checkout, using that branch's stock. Delivery is
          arranged once payment is confirmed and the order moves to Processing.
        </p>
        <h2>Delivery details</h2>
        <p>
          Please make sure your name, phone number and delivery address are correct. Frozen and chilled items
          should be stored in the freezer or chiller as soon as they are received.
        </p>
      </div>
    </>
  );
}

function RefundPolicy() {
  return (
    <>
      <h1 className="page-title">Returns and refunds</h1>
      <div className="info-card">
        <h2>Cancelling an order</h2>
        <p>
          Orders can be cancelled by contacting us before they are delivered. When a paid order is cancelled, the
          items are returned to the branch's stock and the payment will be refunded to the original payment method.
        </p>
        <h2>Damaged or incorrect items</h2>
        <p>
          If an item arrives damaged, spoiled or different from what you ordered, contact us with your order number
          and a photo of the item. We will arrange a replacement or refund after verification.
        </p>
        <h2>Unpaid orders</h2>
        <p>
          If you leave the payment page without paying, the order is not placed and no stock is reserved.
        </p>
      </div>
    </>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <h1 className="page-title">Privacy policy</h1>
      <div className="info-card">
        <h2>Information we collect</h2>
        <ul>
          <li>Account details: name, email address and a securely hashed password.</li>
          <li>Order details: name, phone number, delivery address and the items you purchased.</li>
        </ul>
        <h2>Payments</h2>
        <p>
          Card payments are handled by Stripe. Your card details are entered on Stripe's secure page and are never
          stored on our servers.
        </p>
        <h2>How we use your information</h2>
        <p>
          We use your details only to process and deliver orders, show your order history and provide customer
          support. Staff actions on orders and stock are recorded in an audit trail for security.
        </p>
      </div>
    </>
  );
}

function Terms() {
  return (
    <>
      <h1 className="page-title">Terms of service</h1>
      <div className="info-card">
        <ul>
          <li>Prices are shown in Malaysian Ringgit (RM) and may change without notice.</li>
          <li>Product availability depends on the stock of the branch you select.</li>
          <li>An order is confirmed only after payment is successfully completed.</li>
          <li>Product images and icons are for illustration only.</li>
          <li>We may cancel an order if an item becomes unavailable, in which case a full refund will be given.</li>
        </ul>
      </div>
    </>
  );
}

const PAGES = {
  '/about': AboutUs,
  '/contact': ContactUs,
  '/delivery-policy': DeliveryPolicy,
  '/refund-policy': RefundPolicy,
  '/privacy-policy': PrivacyPolicy,
  '/terms': Terms,
};

export const INFO_PATHS = Object.keys(PAGES);

function InfoPage({ path }) {
  const settings = useShopSettings();
  const Page = PAGES[path];
  return (
    <PageShell>
      <Page settings={settings} />
    </PageShell>
  );
}

export default InfoPage;
