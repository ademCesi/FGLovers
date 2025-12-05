// src/utils/icons.ts
import elephant from "../assets/elephant.svg";
import button from "../assets/button.svg";
import elphOn from "../assets/elephOn.svg";
import elphOff from "../assets/elephOff.svg";

export const icons = {
  elephant,
  button,
  elphOn,
  elphOff
};

export type IconName = keyof typeof icons;
