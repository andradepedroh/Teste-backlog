import { useEffect, useState } from 'react';

export function ResumoPedido({ id }) {
  const [pedido, setPedido] = useState(null);
  useEffect(() => {
    fetch('/api/pedidos/' + id).then((r) => r.json()).then(setPedido);
  }, [id]);
  if (!pedido) return null;
  return <section>Total: R$ {pedido.total.toFixed(2)}</section>;
}
