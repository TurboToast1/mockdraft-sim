// js/trades.js — user-proposed and AI-to-AI trade logic.
(function () {
  window.Trades = {
    // Evaluate an offer from the POV of the AI team being asked to trade.
    // `ai` is the AI side. `giving` = picks AI would give up. `receiving` = picks AI receives.
    evaluate(ai, giving, receiving, context) {
      context = context || {};
      const givenVal    = window.picksValue(giving);
      const receivedVal = window.picksValue(receiving);
      if (givenVal === 0) {
        return { accept: false, reason: "No picks offered in exchange.", ratio: 0 };
      }
      const ratio = receivedVal / givenVal;

      const team = window.TEAMS_BY_ABBR[ai];
      const topQB = context.topQbAvailable || false;
      const standingsRank = context.standingsRank || 16;

      const bestGiven    = Math.min(...giving.map(p => p.overall));
      const bestReceived = Math.min(...receiving.map(p => p.overall));
      const movingDown   = (bestReceived - bestGiven) >= 10;

      if (team && team.needs[0] === "QB" && topQB) {
        if (ratio >= 0.88) {
          return { accept: true, reason: "QB-needy AI team accepts a reasonable discount.", ratio };
        }
      }

      const isTanking = standingsRank <= 3;
      if (isTanking && receiving.length >= 2 && ratio >= 0.93) {
        return { accept: true, reason: "Tanking AI likes quantity for the rebuild.", ratio };
      }

      if (movingDown) {
        if (ratio >= 1.0) return { accept: true, reason: "Fair move-down offer.", ratio };
        return { accept: false, reason: "Won't take a discount to move back this far.", ratio };
      }

      if (ratio >= 0.95) return { accept: true, reason: "Fair value, accepted.", ratio };
      return { accept: false, reason: "Offer is below fair value.", ratio };
    },

    // Apply a trade. Mutates the draftOrder in place and returns a trade record.
    // `fromTeam` gives pick overalls in `givingOveralls`; they become `toTeam`'s.
    // `toTeam` gives pick overalls in `receivingOveralls`; they become `fromTeam`'s.
    execute(draftOrder, fromTeam, toTeam, givingOveralls, receivingOveralls) {
      const gSet = new Set(givingOveralls);
      const rSet = new Set(receivingOveralls);
      draftOrder.forEach(p => {
        if (gSet.has(p.overall)) {
          if (!p.from) p.from = p.team;
          p.team = toTeam;
          p.note = `via ${p.from} (trade)`;
        } else if (rSet.has(p.overall)) {
          if (!p.from) p.from = p.team;
          p.team = fromTeam;
          p.note = `via ${p.from} (trade)`;
        }
      });
      return {
        fromTeam, toTeam,
        giving: [...givingOveralls],
        receiving: [...receivingOveralls],
        timestamp: Date.now()
      };
    },

    // AI-to-AI opportunistic move-up for a top remaining prospect.
    // Called once per round in R1 when option enabled.
    maybeAiToAi(state, context) {
      if (!state.options.aiToAiTrades) return null;
      if (Math.random() >= 0.20) return null;  // 20% chance
      // Find a top-3 remaining prospect who fills a need gap for some AI.
      const top = context.pool.slice(0, 5);
      if (!top.length) return null;

      const currentPick = state.draftOrder[state.currentIndex];
      if (!currentPick) return null;
      // Pick an AI team holding a future pick 5-15 slots later that needs this position.
      const future = state.draftOrder
        .slice(state.currentIndex + 5, state.currentIndex + 20)
        .filter(p => !state.userTeams.includes(p.team));
      if (!future.length) return null;

      const candidate = top[0];
      const mapped = window.AI.mapPos(candidate.pos);
      const buyer = future.find(p => {
        const t = window.TEAMS_BY_ABBR[p.team];
        return t && t.needs.indexOf(mapped) >= 0 && t.needs.indexOf(mapped) <= 3;
      });
      if (!buyer) return null;
      const seller = currentPick.team;
      if (buyer.team === seller) return null;
      if (state.userTeams.includes(seller)) return null;

      // Construct a fair offer: buyer gives their current pick + a later pick.
      const buyerPicks = window.PICKS_BY_TEAM[buyer.team] || [];
      const laterBuyerPick = buyerPicks.find(p => p.overall > buyer.overall && p.round <= 4);
      const offer = laterBuyerPick ? [buyer, laterBuyerPick] : [buyer];
      const receiveForSeller = [currentPick];

      // Seller evaluates (seller is AI)
      const eval_ = this.evaluate(seller, receiveForSeller, offer, {});
      if (!eval_.accept) return null;

      const trade = this.execute(
        state.draftOrder,
        seller,
        buyer.team,
        [currentPick.overall],
        offer.map(o => o.overall)
      );
      return trade;
    }
  };
})();
