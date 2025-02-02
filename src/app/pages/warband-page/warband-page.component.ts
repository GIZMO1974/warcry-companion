import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Color } from 'src/app/core/enums/color.enum';
import { FighterCardMode } from 'src/app/core/enums/fighter-card-mode.enum';
import { Fighter } from 'src/app/core/models/fighter.model';
import { Warband } from 'src/app/core/models/warband.model';
import { WarbandService } from 'src/app/core/services/warband.service';
import { FighterDialogComponent } from 'src/app/shared/components/fighter-dialog/fighter-dialog.component';
import { Ability } from 'src/app/core/models/ability.model';
import { AbilityType } from 'src/app/core/enums/ability-type.enum';
import { AbilityDialogComponent } from 'src/app/shared/components/ability-dialog/ability-dialog.component';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { TranslateService } from '@ngx-translate/core';
import { BattleService } from 'src/app/core/services/battle.service';
import { Subscription, debounceTime, filter } from 'rxjs';
import { FighterRole } from 'src/app/core/enums/fighter-role.enum';
import { ModifierDialogComponent } from 'src/app/shared/components/modifier-dialog/modifier-dialog.component';
import { Modifier } from 'src/app/core/models/modifier.model';
import { EncampmentState } from 'src/app/core/enums/encampment-state.enum';
import { Router } from '@angular/router';
import {
  CdkDrag,
  CdkDragEnd,
  CdkDragEnter,
  CdkDragMove,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray
} from '@angular/cdk/drag-drop';
import { ViewportRuler } from '@angular/cdk/scrolling';
import { CoreService } from 'src/app/core/services/core.service';

@Component({
  selector: 'smitd-warband-page',
  templateUrl: './warband-page.component.html',
  styleUrls: ['./warband-page.component.scss']
})
export class WarbandPageComponent implements OnDestroy, AfterViewInit {
  private _subscriptions = new Subscription();
  public Color = Color;
  public FighterCardMode = FighterCardMode;
  public FighterRole = FighterRole;
  public colorList = Object.keys(Color).map((key) => ({
    key,
    value: Color[key as keyof typeof Color]
  }));
  public EncampmentState = EncampmentState;
  public encampmentStateList = Object.values(EncampmentState);

  public warbandForm: FormGroup;
  public campaignForm: FormGroup;
  public activeTab: number;

  constructor(
    public readonly core: CoreService,
    public readonly warbandService: WarbandService,
    public readonly battleService: BattleService,
    private readonly dialog: MatDialog,
    private readonly translateService: TranslateService,
    private readonly router: Router
  ) {
    if (!this.warband) {
      this.router.navigateByUrl('/');
    }
    this.activeTab = 0;
    this.warbandForm = new FormGroup({
      name: new FormControl(this.warband.name, [Validators.required]),
      faction: new FormControl(this.warband.faction, [Validators.required]),
      alliance: new FormControl(this.warband.alliance, [Validators.required]),
      color: new FormControl(this.warband.color, [Validators.required]),
      abilities: new FormArray([]),
      icon: new FormControl(this.warband ? this.warband.icon : undefined, [])
    });
    this.campaignForm = new FormGroup({
      name: new FormControl(this.warband.campaign.name, []),
      limit: new FormControl(this.warband.campaign.limit, [
        Validators.min(900),
        Validators.max(2000)
      ]),
      reputation: new FormControl(this.warband.campaign.reputation, [
        Validators.min(0)
      ]),
      glory: new FormControl(this.warband.campaign.glory, [Validators.min(0)]),
      progress: new FormControl(this.warband.campaign.progress, [
        Validators.min(0)
      ]),
      notes: new FormControl(this.warband.campaign.notes, []),
      encampment: new FormControl(this.warband.campaign.encampment, []),
      encampmentState: new FormControl(
        this.warband.campaign.encampmentState,
        []
      ),
      quest: new FormControl(this.warband.campaign.quest, []),
      questProgress: new FormControl(this.warband.campaign.questProgress, [
        Validators.min(0)
      ])
    });
    this.addInitialAbilities(this.warband.abilities);

    this._subscriptions.add(
      this.warbandForm.valueChanges
        .pipe(
          filter(() => this.warbandForm.valid),
          debounceTime(400)
        )
        .subscribe(() => this.updateWarband())
    );
    this._subscriptions.add(
      this.campaignForm.valueChanges
        .pipe(
          filter(() => this.campaignForm.valid),
          debounceTime(400)
        )
        .subscribe(() => this.updateCampaign())
    );
  }

  ngOnDestroy(): void {
    this._subscriptions.unsubscribe();
  }

  public get selectedColor(): string {
    return this.warbandForm.get('color')!.value;
  }

  public get warband(): Warband {
    return this.warbandService.selectedWarband;
  }

  public get abilities(): FormArray {
    return this.warbandForm.get('abilities') as FormArray;
  }

  public get abilitiesList(): FormGroup[] {
    return this.abilities.controls as FormGroup[];
  }

  public get icon(): AbstractControl {
    return this.warbandForm.get('icon') as AbstractControl;
  }

  public iconValueChange(icon: string): void {
    this.icon.setValue(icon);
  }

  public updateWarband(): void {
    const editedWarband = { ...this.warband, ...this.warbandForm.value };
    this.warbandService.updateWarband(editedWarband);
  }

  public updateCampaign(): void {
    const editedWarband = {
      ...this.warband,
      campaign: this.campaignForm.value
    };
    this.warbandService.updateWarband(editedWarband);
  }

  public addFighter(): void {
    this._subscriptions.add(
      this.dialog
        .open(FighterDialogComponent, {
          data: { warband: this.warband },
          disableClose: true,
          panelClass: ['full-screen-modal'],
          closeOnNavigation: false
        })
        .afterClosed()
        .subscribe((fighter) => {
          if (fighter) {
            this.warbandService.addFighter(fighter);
          }
        })
    );
  }

  public editFighter(fighter: Fighter, index: number): void {
    this._subscriptions.add(
      this.dialog
        .open(FighterDialogComponent, {
          data: { fighter, edit: true, warband: this.warband },
          disableClose: true,
          panelClass: ['full-screen-modal'],
          closeOnNavigation: false
        })
        .afterClosed()
        .subscribe((updated) => {
          if (updated) {
            this.updateFighter(updated, index);
          }
        })
    );
  }

  public addFighterModifier(fighter: Fighter, index: number): void {
    this._subscriptions.add(
      this.dialog
        .open(ModifierDialogComponent, {
          data: {},
          disableClose: true,
          panelClass: ['full-screen-modal'],
          closeOnNavigation: false
        })
        .afterClosed()
        .subscribe((modifier: Modifier) => {
          if (modifier) {
            fighter.modifiers.push(modifier);
            this.updateFighter(fighter, index);
          }
        })
    );
  }

  public editFighterModifier(
    fighter: Fighter,
    index: number,
    modifierIndex: number
  ): void {
    this._subscriptions.add(
      this.dialog
        .open(ModifierDialogComponent, {
          data: {
            modifier: fighter.modifiers[modifierIndex],
            edit: true
          },
          disableClose: true,
          panelClass: ['full-screen-modal'],
          closeOnNavigation: false
        })
        .afterClosed()
        .subscribe((modifier: Modifier) => {
          if (modifier) {
            fighter.modifiers[modifierIndex] = modifier;
            this.updateFighter(fighter, index);
          }
        })
    );
  }

  public removeFighterModifier(
    fighter: Fighter,
    index: number,
    modifierIndex: number
  ): void {
    this._subscriptions.add(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: {
            yesColor: 'warn',
            question: this.translateService.instant(
              'warband-page.tab.fighters.form.modifiers.remove-question',
              {
                modifier: fighter.modifiers[modifierIndex].name,
                fighter: fighter.name || fighter.type
              }
            )
          },
          closeOnNavigation: false
        })
        .afterClosed()
        .subscribe((decision) => {
          if (decision) {
            fighter.modifiers.splice(modifierIndex, 1);
            this.updateFighter(fighter, index);
          }
        })
    );
  }

  public addFighterAbility(fighter: Fighter, index: number): void {
    this._subscriptions.add(
      this.dialog
        .open(AbilityDialogComponent, {
          data: {},
          disableClose: true,
          panelClass: ['full-screen-modal'],
          closeOnNavigation: false
        })
        .afterClosed()
        .subscribe((abilityFormValue) => {
          if (abilityFormValue) {
            fighter.abilities ||= [];
            fighter.abilities.push(abilityFormValue);
            fighter.abilities = WarbandService.sortAbilities(fighter.abilities);
            this.updateFighter(fighter, index);
          }
        })
    );
  }

  public editFighterAbility(
    fighter: Fighter,
    index: number,
    abilityIndex: number
  ): void {
    this._subscriptions.add(
      this.dialog
        .open(AbilityDialogComponent, {
          data: { edit: true, ability: fighter.abilities[abilityIndex] },
          disableClose: true,
          panelClass: ['full-screen-modal'],
          closeOnNavigation: false
        })
        .afterClosed()
        .subscribe((abilityFormValue) => {
          if (abilityFormValue) {
            fighter.abilities[abilityIndex] = abilityFormValue;
            fighter.abilities = WarbandService.sortAbilities(fighter.abilities);
            this.updateFighter(fighter, index);
          }
        })
    );
  }

  public removeFighterAbility(
    fighter: Fighter,
    index: number,
    abilityIndex: number
  ): void {
    this._subscriptions.add(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: {
            yesColor: 'warn',
            question: this.translateService.instant(
              'warband-page.tab.fighters.form.abilities.remove-question',
              {
                ability: fighter.abilities[abilityIndex].title,
                fighter: fighter.name || fighter.type
              }
            )
          },
          closeOnNavigation: false
        })
        .afterClosed()
        .subscribe((decision) => {
          if (decision) {
            fighter.abilities.splice(abilityIndex, 1);
            this.updateFighter(fighter, index);
          }
        })
    );
  }

  public updateFighter(fighter: Fighter, index: number): void {
    this.warbandService.updateFighter(fighter, index);
  }

  public duplicateFighter(fighter: Fighter): void {
    const duplicated = { ...fighter, ...{ name: '', modifiers: [], note: '' } };
    this._subscriptions.add(
      this.dialog
        .open(FighterDialogComponent, {
          data: { fighter: duplicated, warband: this.warband },
          disableClose: true,
          panelClass: ['full-screen-modal'],
          closeOnNavigation: false
        })
        .afterClosed()
        .subscribe((fighter) => {
          if (fighter) {
            this.warbandService.addFighter(fighter);
          }
        })
    );
  }

  public addAbility(ability?: Ability, sort: boolean = true): FormGroup | void {
    const abilityFormGroup = new FormGroup({
      type: new FormControl(ability ? ability.type : AbilityType.Double, [
        Validators.required
      ]),
      runemarks: new FormControl(ability ? ability.runemarks : [], []),
      prohibitiveRunemarks: new FormControl(
        ability ? ability.prohibitiveRunemarks : [],
        []
      ),
      title: new FormControl(ability ? ability.title : '', [
        Validators.required
      ]),
      description: new FormControl(ability ? ability.description : '', [
        Validators.required
      ])
    });
    this.abilities.push(abilityFormGroup);
    if (sort) {
      const abilities = this.abilities.value as Ability[];
      this.abilities.clear();
      this.addInitialAbilities(WarbandService.sortAbilities(abilities));
    }
  }

  public addNewAbility(ability?: Ability): FormGroup | void {
    this._subscriptions.add(
      this.dialog
        .open(AbilityDialogComponent, {
          data: { ability },
          disableClose: true,
          panelClass: ['full-screen-modal'],
          closeOnNavigation: false
        })
        .afterClosed()
        .subscribe((abilityFormValue) => {
          if (abilityFormValue) {
            this.addAbility(abilityFormValue);
          }
        })
    );
  }

  public editAbility(index: number) {
    this._subscriptions.add(
      this.dialog
        .open(AbilityDialogComponent, {
          data: { ability: this.abilitiesList[index].value, edit: true },
          disableClose: true,
          panelClass: ['full-screen-modal'],
          closeOnNavigation: false
        })
        .afterClosed()
        .subscribe((abilityFormValue) => {
          if (abilityFormValue) {
            this.abilitiesList[index].setValue(abilityFormValue);
            const abilities = this.abilities.value as Ability[];
            this.abilities.clear();
            this.addInitialAbilities(WarbandService.sortAbilities(abilities));
          }
        })
    );
  }

  public removeAbility(index: number): void {
    this._subscriptions.add(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: {
            yesColor: 'warn',
            question: this.translateService.instant(
              'warband-page.tab.warband.form.abilities.remove-question',
              {
                ability: this.abilitiesList[index].value.title,
                warband: this.warbandForm.value.name
              }
            )
          },
          closeOnNavigation: false
        })
        .afterClosed()
        .subscribe((decision) => {
          if (decision) {
            this.abilities.removeAt(index);
          }
        })
    );
  }

  public addInitialAbilities(abilities: Ability[]): void {
    abilities.forEach((ability) => {
      this.addAbility(ability, false);
    });
  }
 // TODO: REFACTOR
  @ViewChild(CdkDropListGroup) listGroup!: CdkDropListGroup<CdkDropList>;
  @ViewChild(CdkDropList) placeholder!: CdkDropList;

  public target!: CdkDropList | null;
  public targetIndex!: number;
  public source!: CdkDropList | null;
  public sourceIndex!: number;
  public activeContainer!: any;
  public showGridLayout: boolean = false;

  ngAfterViewInit(): void {
    const phElement = this.placeholder.element.nativeElement;
    phElement.style.display = 'none';
    phElement.parentElement!.removeChild(phElement);
  }

  dragStarted() {
    this.showGridLayout = true;
  }

  dragEnded(event: CdkDragEnd): void {
    event.source.element.nativeElement.children[0].children[0].children[0].replaceChildren(
      event.source.element.nativeElement.children[0].children[0].children[0]
        .children[0]
    );
    this.showGridLayout = false;
  }

  dropListDropped() {
    if (!this.target) {
      return;
    }

    const phElement = this.placeholder.element.nativeElement;
    const parent = phElement.parentElement!;

    phElement.style.display = 'none';

    parent.removeChild(phElement);
    parent.appendChild(phElement);
    parent.insertBefore(
      this.source!.element.nativeElement,
      parent.children[this.sourceIndex]
    );

    this.target = null;
    this.source = null;
    this.activeContainer = null;

    if (this.sourceIndex !== this.targetIndex) {
      moveItemInArray(
        this.warband.fighters,
        this.sourceIndex,
        this.targetIndex
      );
    }
  }

  cdkDropListEntered(e: CdkDragEnter): any {
    const drag = e.item;
    const drop = e.container;

    if (drop === this.placeholder) {
      return true;
    }

    const phElement = this.placeholder.element.nativeElement;
    const sourceElement = drag.dropContainer.element.nativeElement;
    const dropElement = drop.element.nativeElement;

    if (!dropElement.parentElement) {
      return true;
    }

    const dragIndex = __indexOf(
      dropElement.parentElement!.children,
      this.source ? phElement : sourceElement
    );
    const dropIndex = __indexOf(
      dropElement.parentElement!.children,
      dropElement
    );

    if (!this.source) {
      this.sourceIndex = dragIndex;
      this.source = drag.dropContainer;
      sourceElement.parentElement!.removeChild(sourceElement);
    }

    this.targetIndex = dropIndex;
    this.target = drop;

    phElement.style.display = '';
    dropElement.parentElement!.insertBefore(
      phElement,
      dropIndex > dragIndex ? dropElement.nextSibling : dropElement
    );

    requestAnimationFrame(() => {
      this.placeholder._dropListRef.enter(
        drag._dragRef,
        drag.element.nativeElement.offsetLeft,
        drag.element.nativeElement.offsetTop
      );
    });
  }

  public itemTrackBy(item: any) {
    return item.id;
  }
}

function __indexOf(collection: any, node: any) {
  return Array.prototype.indexOf.call(collection, node);
}
