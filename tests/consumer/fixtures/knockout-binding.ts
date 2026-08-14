export const processorInput =
  'function($context, $element) { return { text:function(){return title}, visible:function(){return $root.ready()}, attr:function(){return {id:$data.id}}, total:function(){return Math.max(amount,0)} } }';

export const processorOutputV001 =
  "function($context,$element){ return {'text':function(){ return $context.$data.title },'visible':function(){ return $context.$root.ready() },'attr':function(){ return {'id':$context.$data.id} },'total':function(){ return Math.max($context.$data.amount,0) }} }";

export const contextVariables = [
  '$root',
  '$index',
  '$parents',
  '$parent',
  'ko',
  '$data',
] as const;
