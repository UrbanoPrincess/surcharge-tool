const ORDER_URL =
  'https://orderonline.demo.deliverit.com.au/portal/api/get_order_json.php';

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

export async function fetchOrders() {
  const response = await fetch(ORDER_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.status}`);
  }

  return response.json();
}

export function startOrderPolling(
  onData: (data: unknown) => void,
  onError?: (error: unknown) => void
) {
  if (running) return;

  running = true;

  async function poll() {
    if (!running) return;

    try {
      const data = await fetchOrders();
      onData(data);
    } catch (error) {
      onError?.(error);
    }

    if (running) {
      timer = setTimeout(poll, 3000);
    }
  }

  poll();
}

export function stopOrderPolling() {
  running = false;

  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}