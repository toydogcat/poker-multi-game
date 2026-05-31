/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, SuperPower, Player, CHARACTER_DATA } from '../types';

export interface PowerResult {
  success: boolean;
  message: string;
  updatedPlayer: Player;
  updatedCard?: Card;
}

/**
 * Calculates the MP cost for a superpower based on player character abilities
 */
export function getMpCost(power: SuperPower, character: string): number {
  switch (power) {
    case SuperPower.RUB_CARD:
      // Sing (star) has discounted cost (变牌大师)
      return character === 'star' ? 20 : 40;
    case SuperPower.PEEK_HAND:
      // Tai Kwan (tai_kwan) is the peeking expert
      return character === 'tai_kwan' ? 10 : 25;
    case SuperPower.ILLUSION:
      return character === 'tat' ? 15 : 50;
    case SuperPower.YEE_MUNG_BOOST:
      return 0; // Yee Mung boost does not cost MP, it gives MP!
    default:
      return 30;
  }
}

/**
 * Executes Rub/Change Card superpower.
 * Target suit and target value can be chosen.
 */
export function executeRubCard(
  player: Player,
  cardId: string,
  targetSuit: 'S' | 'H' | 'D' | 'C',
  targetValue: number
): PowerResult {
  const cost = getMpCost(SuperPower.RUB_CARD, player.avatar);
  
  const updatedPlayer = { ...player };
  if (updatedPlayer.mp < cost) {
    return {
      success: false,
      message: `${player.name} 想發功變牌，無奈功力不夠（精神力 MP 不足）！`,
      updatedPlayer,
    };
  }

  // Cost deduction
  updatedPlayer.mp -= cost;
  
  // Calculate success probability
  let successChance = 0.75; // baseline 75%
  if (player.avatar === 'star') successChance = 0.95; // Starpower!
  if (player.avatar === 'dagger') successChance = 0.85; // Dagger
  if (player.avatar === 'devil_chan') successChance = 0.50; // Old devil
  if (player.avatar === 'tat') successChance = 0.05; // Uncle Tat has very low direct success chance

  const isSuccess = Math.random() < successChance;
  
  let targetCardIndex = updatedPlayer.cards.findIndex(c => c.id === cardId);
  if (targetCardIndex === -1) {
    // If card not found, pick first card
    targetCardIndex = 0;
  }
  
  const originalCard = updatedPlayer.cards[targetCardIndex];
  if (!originalCard) {
    return { success: false, message: '手牌好像不見了！', updatedPlayer };
  }

  const updatedCard = { ...originalCard };
  
  if (isSuccess) {
    // Save original for fun/tracking
    updatedCard.originalSuit = originalCard.suit;
    updatedCard.originalValue = originalCard.value;
    updatedCard.suit = targetSuit;
    updatedCard.value = targetValue;
    updatedCard.isPowerChanged = true;
    
    // Create new id to avoid HTML/key cache issues
    updatedCard.id = `power-${Date.now()}-${targetSuit}-${targetValue}`;
    updatedPlayer.cards[targetCardIndex] = updatedCard;

    return {
      success: true,
      message: `【🎉 搓牌成功！】${player.name} 大喝一聲，使出特異功能！將 ${originalCard.suit}${originalCard.value} 搓成了 ✨ ${targetSuit}${targetValue}！`,
      updatedPlayer,
      updatedCard,
    };
  } else {
    // Humorous failure and "con congenital failure"
    // In movie, Stephen Chow once rubbed cards and got "Clubs 3/Diamonds 3" (烏龍梅花3)
    const fails = [
      { suit: 'C' as const, value: 3 },
      { suit: 'D' as const, value: 3 },
    ];
    const failPick = fails[Math.floor(Math.random() * fails.length)];
    
    updatedCard.originalSuit = originalCard.suit;
    updatedCard.originalValue = originalCard.value;
    updatedCard.suit = failPick.suit;
    updatedCard.value = failPick.value;
    updatedCard.isPowerChanged = true;
    updatedCard.id = `power-fail-${Date.now()}-${failPick.suit}-${failPick.value}`;
    
    updatedPlayer.cards[targetCardIndex] = updatedCard;
    
    return {
      success: false,
      message: `【💥 搓牌出錯！】${player.name} 突然精神渙散！牌起白煙，竟然搓出了一張 🃏 梅花/磚塊 3！功力直接消耗！`,
      updatedPlayer,
      updatedCard,
    };
  }
}

/**
 * Execute Yee-Mung's Encouragement
 */
export function executeYeeMungBoost(player: Player): PowerResult {
  const updatedPlayer = { ...player };
  updatedPlayer.mp = Math.min(100, updatedPlayer.mp + 60); // restore 60 MP
  
  const quotes = [
    '「阿星，我相信你！加油！」',
    '「你是最棒的，在我的心裡你永遠是賭神！」',
    '「阿星，看著我，不要分心！」',
  ];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  
  return {
    success: true,
    message: `【🌸 綺夢現身！】綺夢對 ${player.name} 甜美一笑並說出：${quote}！精神力大幅恢復 60 點！`,
    updatedPlayer,
  };
}

/**
 * Get random trashing commentary when playing or using powers
 */
export function getCharacterTrashingSound(avatar: string, action: string): string {
  const dialogues: { [key: string]: { [key: string]: string[] } } = {
    star: {
      power: [
        '「太保，幫我拿杯熱咖啡，我要發功搓牌了！」',
        '「全神貫注，看我的無敵搓牌法！」',
        '「看著！這就是特異功能！」',
      ],
      win: [
        '「哈哈，承讓承讓！綺夢，我贏了！」',
        '「三叔，我們不用再去領救濟金了！」',
      ],
      lose: [
        '「哎呀！是不是三叔又叫我星哥害我功力全失啊！」',
        '「可惡，今天特異功能發電量不夠！」',
      ],
    },
    tat: {
      power: [
        '「哎呀呀，先天性失控！大家跟著我一塊跳！」',
        '「星哥！星哥！你沒事吧星哥！」',
        '「我的軟飯硬吃神功要來了！」',
      ],
      win: ['「發財啦！今晚夜總會，我請客！」', '「看見沒有？這就是實力！」'],
      lose: ['「沒天理啊，星哥你怎麼沒發功救我啊！」', '「我的心臟病要犯了...」'],
    },
    yee_mung: {
      power: [
        '「阿星，看著我，加油！」',
        '「只要你在，奇蹟就會發生。」',
      ],
      win: ['「阿星，太好了，你真的做到了！」', '「恭喜你赢了這局。」'],
      lose: ['「沒關係，下一局一定會贏回來的。」', '「阿星，你沒受傷吧？」'],
    },
    tai_kwan: {
      power: [
        '「哼，特異功能？不是只有阿星才會！」',
        '「一隻眼睛看就足夠看穿你的牌！」',
        '「大軍在此，誰敢放肆！」',
      ],
      win: [
        '「哈哈哈！阿星，你終究鬥不過我一隻眼！」',
        '「看來我的發電量比你高！」',
      ],
      lose: [
        '「唔！怎麼可能？難道他的發電量超過十萬伏特？」',
        '「我的眼睛...好痛！」',
      ],
    },
    dagger: {
      power: [
        '「看好！我刀仔的牌技，不需要特異功能！」',
        '「飛牌巧克力，看我的牌技！」',
      ],
      win: ['「師父教的賭技，果然天下無雙！」', '「贏得光明磊落！」'],
      lose: ['「可惡，大意了，沒有閃！」', '「下次絕對連本帶利贏回來！」'],
    },
    devil_chan: {
      power: [
        '「年輕人，我們現在是在公海上，這裡不適用法律！」',
        '「老夫吃鹽多過你吃米，想跟我鬥？」',
        '「我有巴拿馬總統的關係，跟我玩？」',
      ],
      win: ['「哈哈，跟我鬥，你太嫩了！」', '「這就是經驗的差距，小伙子！」'],
      lose: ['「唔！我的巴拿馬總統關係呢...」', '「你...你一定使詐！出千！」'],
    },
  };

  const pool = dialogues[avatar]?.[action] || ['「看招！」', '「承讓了！」', '「今天手氣不錯！」'];
  return pool[Math.floor(Math.random() * pool.length)];
}
