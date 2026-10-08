import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DPad from '../components/DPad.vue';
import vuetify from '../plugins/vuetify.js';

describe('DPad Component', () => {
  it('renders all 5 buttons and emits proper commands on click', async () => {
    const wrapper = mount(DPad, {
      global: {
        plugins: [vuetify]
      }
    });

    const upBtn = wrapper.find('.dpad-btn-up');
    expect(upBtn.exists()).toBe(true);
    await upBtn.trigger('click');
    expect(wrapper.emitted('command')?.[0]).toEqual(['up']);

    const downBtn = wrapper.find('.dpad-btn-down');
    await downBtn.trigger('click');
    expect(wrapper.emitted('command')?.[1]).toEqual(['down']);

    const leftBtn = wrapper.find('.dpad-btn-left');
    await leftBtn.trigger('click');
    expect(wrapper.emitted('command')?.[2]).toEqual(['left']);

    const rightBtn = wrapper.find('.dpad-btn-right');
    await rightBtn.trigger('click');
    expect(wrapper.emitted('command')?.[3]).toEqual(['right']);

    const centerBtn = wrapper.find('.dpad-btn-center');
    await centerBtn.trigger('click');
    expect(wrapper.emitted('command')?.[4]).toEqual(['ok']);
  });
});
