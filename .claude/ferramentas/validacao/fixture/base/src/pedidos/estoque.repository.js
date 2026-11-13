import { db } from '../db.js';

export async function buscarEstoque(produtoId) {
  const [linha] = await db.query('select quantidade from estoque where produto_id = $1', [produtoId]);
  return linha;
}

export async function buscarEstoques(produtoIds) {
  return db.query('select produto_id, quantidade from estoque where produto_id = any($1)', [produtoIds]);
}

export async function gravarPedido(clienteId, itens) {
  return db.insert('pedidos', { clienteId, itens });
}
