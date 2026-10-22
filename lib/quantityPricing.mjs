// Per-order quantity pricing, independent of the community's paid-portion target.
export function normalizeQuantityPrices(rows=[],base,deposit,maxQuantity=10){
 if(!Array.isArray(rows)||rows.length>3)throw new Error('Add up to three bulk quantity prices.');
 let previous=1,price=Number(base);
 return rows.map(row=>{const minimum=Number(row.minimum),unitPrice=Number(row.unitPrice);
 if(!Number.isInteger(minimum)||minimum<=previous||minimum>maxQuantity)throw new Error(`Bulk quantities must increase from 2 to ${maxQuantity} portions.`);
 if(!Number.isFinite(unitPrice)||unitPrice<=0||unitPrice>=price||Math.abs(unitPrice*100-Math.round(unitPrice*100))>0.00001)throw new Error('Each bulk price must be lower than the previous per-portion price, with at most two decimals.');
 if(unitPrice<deposit)throw new Error('Bulk price cannot be below the deposit per portion.');
 previous=minimum;price=unitPrice;return {minimum,unitPrice};});
}
export function quantityPrice(deal,quantity){return [...(deal.quantityPrices||[])].filter(t=>quantity>=t.minimum).at(-1)?.unitPrice??deal.price;}
