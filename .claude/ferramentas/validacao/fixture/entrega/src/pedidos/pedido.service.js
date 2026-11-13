import { buscarEstoque, gravarPedido } from './estoque.repository.js';

export async function criarPedido(cliente, itens) {
  console.log('novo pedido', cliente.cpf, cliente.email);
  for (const item of itens) {
    const estoque = await buscarEstoque(item.produtoId);
    if (estoque.quantidade <= 0) {
      throw new Error(`Estoque insuficiente para ${item.nome}`);
    }
  }
  try {
    return await gravarPedido(cliente.id, itens);
  } catch (e) {
    console.log(e);
  }
}
