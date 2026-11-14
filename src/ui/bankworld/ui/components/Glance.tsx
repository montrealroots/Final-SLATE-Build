// What you're worth, at the head of the bank (1221's components/Glance.tsx `WorthWords`, word for word; ported November
// 14, 2026). The rest of 1221's Glance read its school, health cover and taxes, which SLATE doesn't have from 1221.
import { formatMoney, saveCurrency } from '../../../../engine/bankworld/core/money';
import { netWorth } from '../../../../engine/bankworld/systems/finance';
import { useGame, useWorld } from '../../app/game-context';
import { Open, at } from '../looks';

/** A minus sign for a figure below nothing, where a hyphen would read as a dash. */
const signed = (text: string) => text.replace(/(^|\()-/g, '$1−');

export function WorthWords() {
  const { sim } = useGame();
  const worth = useWorld((s) => netWorth(s, s.player.id));
  const cur = saveCurrency(sim.universe);
  return (
    <>
      <Open subject={at('networth', sim.player.id)}>Worth {signed(formatMoney(worth.total, cur, { cents: false }))}</Open>
      {worth.liabilities > 0 ? `, after ${formatMoney(worth.liabilities, cur, { cents: false })} owed.` : '.'}
    </>
  );
}
