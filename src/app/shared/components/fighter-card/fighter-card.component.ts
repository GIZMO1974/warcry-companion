import {
  Component,
  EventEmitter,
  Input,
  Output,
  ElementRef,
  ViewChild
} from '@angular/core';
import { Color } from 'src/app/core/enums/color.enum';
import { FighterCardMode } from 'src/app/core/enums/fighter-card-mode.enum';
import { FighterRole } from 'src/app/core/enums/fighter-role.enum';
import { FighterState } from 'src/app/core/enums/fighter-state.enum';
import { CoreService } from 'src/app/core/services/core.service';
import { Observable } from 'rxjs';
import { MonsterStat } from 'src/app/core/models/monster-stat.model';
import { MatExpansionPanelHeader } from '@angular/material/expansion';
import { Fighter } from 'src/app/core/models/fighter.model';
import { FighterReference } from 'src/app/core/models/fighter-reference.model';

@Component({
  selector: 'smitd-fighter-card',
  templateUrl: './fighter-card.component.html',
  styleUrls: ['./fighter-card.component.scss']
})
export class FighterCardComponent {
  @Input('fighter') fighter: Fighter;
  @Input('fighterReference') fighterReference?: FighterReference;
  @Input('mode') mode: string;
  @Input('campaign') campaign: boolean;
  public Color = Color;
  public FighterRole = FighterRole;
  public FighterCardMode = FighterCardMode;
  public FighterState = FighterState;
  @Output() callAbilities: EventEmitter<null>;
  @Output() woundChange: EventEmitter<number>;
  public expanded: boolean;
  public battleFrameHeight: string;
  @ViewChild('fighterExpansionHeader')
  fighterExpansionHeader!: MatExpansionPanelHeader;

  constructor(public readonly core: CoreService) {
    this.fighter = {
      role: FighterRole.Thrall,
      type: 'Error Thrall',
      movement: 1,
      toughness: 1,
      wounds: 2,
      runemarks: ['Minion'],
      weapons: [
        {
          range: 1,
          attacks: 1,
          strength: 2,
          damage: 1,
          crit: 2,
          type: 'Claws'
        }
      ],
      points: 100,
      name: '',
      modifiers: [],
      abilities: [],
      notes: ''
    };
    this.mode = 'roster';
    this.campaign = false;
    this.callAbilities = new EventEmitter();
    this.woundChange = new EventEmitter();
    this.expanded = false;
    this.battleFrameHeight = '80px';
  }

  public get headerColor(): Observable<any> {
    return this.core.color.pipe();
  }

  public get dead(): boolean {
    return (
      !!this.fighterReference &&
      this.fighterReference!.state === FighterState.Dead
    );
  }

  public get deadColor(): string | undefined {
    if (!this.fighterReference) {
      return undefined;
    }
    return this.dead
      ? this.core.getTheme() === 'dark'
        ? '#222222'
        : '#cccccc'
      : undefined;
  }

  public getModifier(
    stat: string,
    secondary: string = '',
    weaponIndex: number = 0
  ): number {
    if (!this.fighterReference) return 0;
    switch (stat) {
      case 'movement':
        return (
          (this.campaign ? (this.fighterReference.modifiers as any)[stat] : 0) +
          (this.fighterReference.carryingTreasure ? -2 : 0)
        );
      case 'weapon':
        return this.campaign
          ? (this.fighterReference.modifiers.weapons as any)[weaponIndex][
              secondary
            ]
          : 0;
      default:
        return this.campaign
          ? (this.fighterReference.modifiers as any)[stat]
          : 0;
    }
  }

  public getModified(
    stat: string,
    secondary: string = '',
    weaponIndex: number = 0
  ): number {
    if (!this.fighterReference) {
      switch (stat) {
        case 'weapon':
          return this.getFighterStat(stat, secondary, weaponIndex);
        default:
          return this.getFighterStat(stat);
      }
    }
    let modified: number = 1;
    switch (stat) {
      case 'weapon':
        modified =
          this.getFighterStat(stat, secondary, weaponIndex) +
          this.getModifier(stat, secondary, weaponIndex);
        break;
      default:
        modified =
          this.getFighterStat(stat) +
          this.getModifier(stat, secondary, weaponIndex);
        break;
    }
    return modified > 1 ? modified : 1;
  }

  public getFighterStat(
    stat: string,
    secondary: string = '',
    weaponIndex: number = 0
  ): number {
    switch (stat) {
      case 'weapon':
        return this.fighter.role == FighterRole.Monster
          ? this.getMonsterStat(stat, secondary)
          : (this.fighter.weapons[weaponIndex] as any)[secondary];
      default:
        return this.fighter.role == FighterRole.Monster
          ? this.getMonsterStat(stat, secondary)
          : (this.fighter as any)[stat];
    }
  }

  public getMonsterStat(stat: string, secondary: string = ''): number {
    const monsterTable: MonsterStat[] = this.fighter.monsterStatTable!;
    if (this.mode !== 'battle') {
      switch (stat) {
        case 'weapon':
          switch (secondary) {
            case 'damage':
              return monsterTable[0][secondary];
            case 'crit':
              return monsterTable[0][secondary];
            default:
              return (this.fighter.weapons[0] as any)[secondary];
          }
        case 'movement':
          return (monsterTable as any)[0][stat];
        default:
          return (this.fighter as any)[stat];
      }
    }
    const monsterStatIndex = monsterTable?.findIndex(
      (stats) => stats.minHealth <= (this.fighterReference?.wounds || 0)
    );
    if (monsterStatIndex < 0) {
      switch (stat) {
        case 'weapon':
          return (this.fighter.weapons[0] as any)[secondary];
        default:
          return (this.fighter as any)[stat];
      }
    }

    switch (stat) {
      case 'weapon':
        switch (secondary) {
          case 'damage':
            return monsterTable[monsterStatIndex][secondary];
          case 'crit':
            return monsterTable[monsterStatIndex][secondary];
          default:
            return (this.fighter.weapons[0] as any)[secondary];
        }
      default:
        switch (stat) {
          case 'movement':
            return (monsterTable as any)[monsterStatIndex][stat];
          default:
            return (this.fighter as any)[stat];
        }
    }
  }

  public setBattleFrameHeight(header: MatExpansionPanelHeader): void {
    this.battleFrameHeight = `${
      ((header as any)._element as ElementRef).nativeElement.clientHeight
    }px`;
  }
}
