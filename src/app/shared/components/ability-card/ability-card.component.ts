import { Component, Input } from '@angular/core';
import { AbilityType } from 'src/app/core/enums/ability-type.enum';
import { Ability } from 'src/app/core/models/ability.model';

@Component({
  selector: 'smitd-ability-card',
  templateUrl: './ability-card.component.html',
  styleUrls: ['./ability-card.component.scss']
})
export class AbilityCardComponent {
  @Input() ability: Ability;
  @Input() showRunemarks: boolean;
  @Input() darkBorders: boolean;
  @Input() edit: boolean;

  constructor() {
    this.ability = {
      type: AbilityType.Single,
      runemarks: [],
      title: 'unset',
      description: 'error unset ability'
    };
    this.showRunemarks = false;
    this.darkBorders = true;
    this.edit = false;
  }

}
