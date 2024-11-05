export type RequestCreate = {
  wheelConfig: {
    displayWinnerDialog: true;
    slowSpin: false;
    pageBackgroundColor: '#FFFFFF';
    description: string;
    animateWinner: false;
    winnerMessage: string;
    title: string;
    type: 'color';
    autoRemoveWinner: false;
    playClickWhenWinnerRemoved: false;
    maxNames: 1000;
    afterSpinSoundVolume: 50;
    spinTime: 10;
    hubSize: 'S';
    entries: { text: string }[];
    isAdvanced: false;
    colorSettings: [
      {
        color: '#6149CD';
        enabled: true;
      },
      {
        color: '#27AE60';
        enabled: true;
      },
      {
        color: '#FFCD1B';
        enabled: true;
      },
      {
        color: '#F7F8FA';
        enabled: true;
      },
    ];
    showTitle: true;
    displayHideButton: true;
    duringSpinSoundVolume: 50;
    displayRemoveButton: true;
    allowDuplicates: true;
    drawOutlines: false;
    launchConfetti: true;
    drawShadow: true;
  };
  shareMode: 'copyable';
};

export type RequestUpdate = {
  where: {
    path: string;
  };
  data: {
    wheelConfig: {
      title: string;
      description: string;
      entries: { text: string }[];
    };
  };
};

export type RequestGet = {
  where: {
    path: string;
  };
};
